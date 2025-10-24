import * as SQLite from 'expo-sqlite';
import { ChatMessage, ChatConversation, ChatMember } from '../types/chat';

class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private isInitialized = false;

    /**
     * Initialize database connection and create tables
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.db = await SQLite.openDatabaseAsync('chat.db');
            await this.createTables();
            this.isInitialized = true;
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Create all necessary tables
     */
    private async createTables(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // Conversations table
        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                avatar_url TEXT,
                created_by TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                member_count INTEGER NOT NULL DEFAULT 0,
                user_role TEXT NOT NULL DEFAULT 'MEMBER',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_message_id TEXT,
                last_message_text TEXT,
                last_message_timestamp TEXT,
                last_message_mine INTEGER NOT NULL DEFAULT 0,
                last_message_sender_name TEXT,
                last_message_type TEXT DEFAULT 'TEXT',
                last_message_activity_id TEXT,
                last_message_activity_name TEXT,
                last_message_activity_purpose TEXT
            );
        `);

        // Messages table
        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                sender_avatar TEXT,
                type TEXT NOT NULL,
                content_text TEXT,
                content_image_url TEXT,
                content_file_name TEXT,
                content_file_url TEXT,
                content_activity_id TEXT,
                content_activity_name TEXT,
                content_activity_purpose TEXT,
                created_at TEXT NOT NULL,
                mine INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'sent',
                synced INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
        `);

        // Migration: Add activity fields to existing messages table
        try {
            await this.db.execAsync(`
                ALTER TABLE messages ADD COLUMN content_activity_id TEXT;
            `);
        } catch (error) {
            // Column already exists, ignore error
        }

        try {
            await this.db.execAsync(`
                ALTER TABLE messages ADD COLUMN content_activity_name TEXT;
            `);
        } catch (error) {
            // Column already exists, ignore error
        }

        try {
            await this.db.execAsync(`
                ALTER TABLE messages ADD COLUMN content_activity_purpose TEXT;
            `);
        } catch (error) {
            // Column already exists, ignore error
        }

        // Members table
        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                avatar_url TEXT,
                role TEXT NOT NULL DEFAULT 'MEMBER',
                joined_at TEXT NOT NULL,
                is_current_user INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
        `);

        // Create indexes for better performance
        await this.db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
            CREATE INDEX IF NOT EXISTS idx_messages_synced ON messages (synced);
            CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (updated_at);
            CREATE INDEX IF NOT EXISTS idx_members_conversation_id ON members (conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_mine ON messages (mine);
        `);

        // DATABASE MIGRATION: Add last_message_sender_name column if not exists
        await this.migrateDatabase();

        console.log('✅ Database tables created successfully');
    }

    /**
     *  DATABASE MIGRATION: Add new columns to existing tables
     */
    private async migrateDatabase(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            // Check existing columns
            const tableInfo = await this.db.getAllAsync(`
                PRAGMA table_info(conversations)
            `);

            const existingColumns = tableInfo.map((column: any) => column.name);

            // Add last_message_sender_name column if not exists
            if (!existingColumns.includes('last_message_sender_name')) {
                console.log('🔄 [DatabaseMigration] Adding last_message_sender_name column...');
                await this.db.execAsync(`
                    ALTER TABLE conversations 
                    ADD COLUMN last_message_sender_name TEXT
                `);
                console.log('✅ [DatabaseMigration] Added last_message_sender_name column successfully');
            }

            // Add Activity message columns if not exist
            const activityColumns = [
                'last_message_type',
                'last_message_activity_id',
                'last_message_activity_name',
                'last_message_activity_purpose'
            ];

            for (const columnName of activityColumns) {
                if (!existingColumns.includes(columnName)) {
                    console.log(`🔄 [DatabaseMigration] Adding ${columnName} column...`);
                    const columnType = columnName === 'last_message_type' ? 'TEXT DEFAULT "TEXT"' : 'TEXT';
                    await this.db.execAsync(`
                        ALTER TABLE conversations 
                        ADD COLUMN ${columnName} ${columnType}
                    `);
                    console.log(`✅ [DatabaseMigration] Added ${columnName} column successfully`);
                }
            }

            console.log('ℹ️ [DatabaseMigration] All columns are up to date');
        } catch (error) {
            console.error('❌ [DatabaseMigration] Migration failed:', error);
            // Don't throw error - app should still work
        }
    }

    // ==================== CONVERSATIONS ====================

    /**
     * Save conversation to local database
     */
    async saveConversation(conversation: ChatConversation): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const lastMessage = conversation.lastMessage;

        await this.db.runAsync(`
            INSERT OR REPLACE INTO conversations (
                id, type, name, avatar_url, created_by, status, member_count, 
                user_role, created_at, updated_at, last_message_id, 
                last_message_text, last_message_timestamp, last_message_mine, last_message_sender_name,
                last_message_type, last_message_activity_id, last_message_activity_name, last_message_activity_purpose
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            conversation.id,
            conversation.type || 'PRIVATE',
            conversation.name || 'Unnamed Conversation',
            conversation.avatarUrl || null,
            conversation.createdBy || 'unknown',
            conversation.status || 'ACTIVE',
            conversation.memberCount || 0,
            conversation.userRole || 'MEMBER',
            conversation.createdAt || new Date().toISOString(),
            conversation.createdAt || new Date().toISOString(), // updated_at
            lastMessage?.id || null,
            lastMessage?.content.text || null,
            lastMessage?.createdAt || null,
            lastMessage?.mine ? 1 : 0,
            lastMessage?.senderName || null,
            lastMessage?.type || 'TEXT',
            lastMessage?.content.activityId || null,
            lastMessage?.content.name || null,
            lastMessage?.content.purpose || null
        ]);
    }

    /**
     * Update conversation's last message in database
     */
    async updateConversationLastMessage(
        conversationId: string,
        messageId: string,
        messageTimestamp: string,
        isMine: boolean,
        senderName?: string,
        messageType?: string,
        activityId?: string,
        activityName?: string,
        activityPurpose?: string
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(`
            UPDATE conversations 
            SET 
                last_message_id = ?,
                last_message_timestamp = ?,
                last_message_mine = ?,
                last_message_sender_name = ?,
                last_message_type = ?,
                last_message_activity_id = ?,
                last_message_activity_name = ?,
                last_message_activity_purpose = ?,
                updated_at = ?
            WHERE id = ?
        `, [
            messageId,
            messageTimestamp,
            isMine ? 1 : 0,
            senderName || null,
            messageType || 'TEXT',
            activityId || null,
            activityName || null,
            activityPurpose || null,
            new Date().toISOString(),
            conversationId
        ]);

        console.log('✅ [DatabaseService] Updated conversation last message:', {
            conversationId,
            messageId,
            messageTimestamp,
            isMine,
            messageType,
            activityId,
            activityName,
            activityPurpose
        });
    }

    /**
     * Get all conversations from local database
     */
    async getConversations(): Promise<ChatConversation[]> {
        if (!this.db) throw new Error('Database not initialized');

        // SẮP XẾP THEO lastMessage.createdAt (DESC - từ mới đến cũ)
        const result = await this.db.getAllAsync(`
            SELECT * FROM conversations 
            ORDER BY last_message_timestamp DESC, created_at DESC
        `);

        const conversations = result.map(this.mapConversationFromDB);

        // Load full lastMessage data for each conversation
        for (const conversation of conversations) {
            if (conversation.lastMessage) {
                const fullMessage = await this.getMessageById(conversation.lastMessage.id);
                if (fullMessage) {
                    conversation.lastMessage = fullMessage;
                }
            }
        }

        return conversations;
    }

    /**
     * Get specific conversation from local database
     */
    async getConversation(conversationId: string): Promise<ChatConversation | null> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync(`
            SELECT * FROM conversations WHERE id = ?
        `, [conversationId]);

        const conversation = result ? this.mapConversationFromDB(result) : null;

        // Load full lastMessage data
        if (conversation?.lastMessage) {
            const fullMessage = await this.getMessageById(conversation.lastMessage.id);
            if (fullMessage) {
                conversation.lastMessage = fullMessage;
            }
        }

        return conversation;
    }

    /**
     * Get message by ID from local database
     */
    async getMessageById(messageId: string): Promise<ChatMessage | null> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getFirstAsync(`
            SELECT * FROM messages WHERE id = ?
        `, [messageId]);

        return result ? this.mapMessageFromDB(result) : null;
    }

    /**
     * Update conversation in local database
     */
    async updateConversation(conversationId: string, updates: Partial<ChatConversation>): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const updateFields = Object.entries(updates)
            .filter(([key, value]) => key !== 'id' && value !== undefined)
            .map(([key, value]) => {
                // Map TypeScript field names to database column names
                const dbField = key === 'avatarUrl' ? 'avatar_url' :
                    key === 'createdBy' ? 'created_by' :
                        key === 'memberCount' ? 'member_count' :
                            key === 'userRole' ? 'user_role' :
                                key === 'createdAt' ? 'created_at' : key;
                return `${dbField} = ?`;
            });

        const values = Object.entries(updates)
            .filter(([key, value]) => key !== 'id' && value !== undefined)
            .map(([, value]) => {
                // Convert values to appropriate types for SQLite
                if (typeof value === 'object' && value !== null) {
                    return JSON.stringify(value);
                }
                return value;
            });

        if (updateFields.length === 0) return;

        await this.db.runAsync(`
            UPDATE conversations 
            SET ${updateFields.join(', ')}, updated_at = ?
            WHERE id = ?
        `, [...values, new Date().toISOString(), conversationId]);
    }

    // ==================== MESSAGES ====================

    /**
     * Save message to local database
     */
    async saveMessage(message: ChatMessage): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(`
            INSERT OR REPLACE INTO messages (
                id, conversation_id, sender_id, sender_name, sender_avatar,
                type, content_text, content_image_url, content_file_name, 
                content_file_url, content_activity_id, content_activity_name, content_activity_purpose,
                created_at, mine, status, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            message.id,
            message.conversationId,
            message.senderId || 'unknown',
            message.senderName || 'Unknown User',
            message.senderAvatar || null,
            message.type || 'TEXT',
            message.content.text || null,
            null, // imageUrl - removed
            null, // fileName - removed  
            null, // fileUrl - removed
            message.content.activityId || null,
            message.content.name || null,
            message.content.purpose || null,
            message.createdAt || new Date().toISOString(),
            message.mine ? 1 : 0,
            'sent',
            1 // synced
        ]);

        // UPDATE CONVERSATION: Update last_message_timestamp when new message is saved
        await this.db.runAsync(`
            UPDATE conversations 
            SET 
                last_message_timestamp = ?, 
                last_message_text = ?, 
                last_message_mine = ?, 
                last_message_sender_name = ?,
                last_message_type = ?,
                last_message_activity_id = ?,
                last_message_activity_name = ?,
                last_message_activity_purpose = ?
            WHERE id = ?
        `, [
            message.createdAt || new Date().toISOString(),
            message.content.text || '',
            message.mine ? 1 : 0,
            message.senderName || null,
            message.type || 'TEXT',
            message.content.activityId || null,
            message.content.name || null,
            message.content.purpose || null,
            message.conversationId
        ]);
    }

    /**
     * Get messages from conversation with pagination
     */
    async getMessages(
        conversationId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<ChatMessage[]> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getAllAsync(`
            SELECT * FROM messages 
            WHERE conversation_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [conversationId, limit, offset]);

        return result.map(this.mapMessageFromDB);
    }

    /**
     * Get unsynced messages (for background sync)
     */
    async getUnsyncedMessages(): Promise<ChatMessage[]> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getAllAsync(`
            SELECT * FROM messages 
            WHERE synced = 0
            ORDER BY created_at ASC
        `);

        return result.map(this.mapMessageFromDB);
    }

    /**
     * Mark message as synced
     */
    async markMessageAsSynced(messageId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(`
            UPDATE messages 
            SET synced = 1 
            WHERE id = ?
        `, [messageId]);
    }

    /**
     * Update message status
     */
    async updateMessageStatus(messageId: string, status: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(`
            UPDATE messages 
            SET status = ? 
            WHERE id = ?
        `, [status, messageId]);
    }

    /**
     * Delete message from local database
     */
    async deleteMessage(messageId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(`
            DELETE FROM messages WHERE id = ?
        `, [messageId]);
    }

    // ==================== MEMBERS ====================

    /**
     * Save member to local database
     */
    async saveMember(member: ChatMember, conversationId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.runAsync(`
            INSERT OR REPLACE INTO members (
                id, conversation_id, user_id, user_name, avatar_url, 
                role, joined_at, is_current_user
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            `${conversationId}_${member.userId}`,
            conversationId,
            member.userId || 'unknown',
            member.userName || 'Unknown User',
            member.avatarUrl || null,
            member.role || 'MEMBER',
            member.joinedAt || new Date().toISOString(),
            member.isCurrentUser ? 1 : 0
        ]);
    }

    /**
     * Get members of a conversation
     */
    async getMembers(conversationId: string): Promise<ChatMember[]> {
        if (!this.db) throw new Error('Database not initialized');

        const result = await this.db.getAllAsync(`
            SELECT user_id, user_name, avatar_url, role, joined_at, is_current_user
            FROM members 
            WHERE conversation_id = ?
            ORDER BY joined_at ASC
        `, [conversationId]);

        return result.map(this.mapMemberFromDB);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Clear all data (for testing or logout)
     */
    async clearAllData(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        console.log('🧹 [DatabaseService] Clearing all user data...');

        await this.db.execAsync(`
            DELETE FROM messages;
            DELETE FROM members;
            DELETE FROM conversations;
        `);

        console.log('✅ [DatabaseService] All user data cleared successfully');
    }

    /**
     * Reset database (drop and recreate tables)
     */
    async resetDatabase(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.execAsync(`
            DROP TABLE IF EXISTS messages;
            DROP TABLE IF EXISTS members;
            DROP TABLE IF EXISTS conversations;
        `);

        await this.createTables();
        console.log('✅ Database reset completed');
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        conversations: number;
        messages: number;
        members: number;
        unsyncedMessages: number;
    }> {
        if (!this.db) throw new Error('Database not initialized');

        const [conversations, messages, members, unsyncedMessages] = await Promise.all([
            this.db.getFirstAsync('SELECT COUNT(*) as count FROM conversations'),
            this.db.getFirstAsync('SELECT COUNT(*) as count FROM messages'),
            this.db.getFirstAsync('SELECT COUNT(*) as count FROM members'),
            this.db.getFirstAsync('SELECT COUNT(*) as count FROM messages WHERE synced = 0')
        ]);

        return {
            conversations: (conversations as any)?.count || 0,
            messages: (messages as any)?.count || 0,
            members: (members as any)?.count || 0,
            unsyncedMessages: (unsyncedMessages as any)?.count || 0
        };
    }

    // ==================== MAPPING METHODS ====================

    private mapConversationFromDB(row: any): ChatConversation {
        return {
            id: row.id,
            type: row.type,
            name: row.name,
            avatarUrl: row.avatar_url,
            createdBy: row.created_by,
            status: row.status,
            memberCount: row.member_count,
            userRole: row.user_role,
            createdAt: row.created_at,
            lastMessage: row.last_message_id ? {
                id: row.last_message_id,
                conversationId: row.id,
                senderId: '',
                senderName: row.last_message_sender_name || '',
                senderAvatar: '',
                type: (row.last_message_type || 'TEXT') as 'TEXT' | 'ACTIVITY',
                content: {
                    text: row.last_message_text,
                    activityId: row.last_message_activity_id,
                    name: row.last_message_activity_name,
                    purpose: row.last_message_activity_purpose
                },
                createdAt: row.last_message_timestamp,
                mine: row.last_message_mine === 1
            } : undefined
        };
    }

    private mapMessageFromDB(row: any): ChatMessage {
        return {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            senderAvatar: row.sender_avatar,
            type: row.type,
            content: {
                text: row.content_text,
                // ACTIVITY content - will be null for TEXT messages
                activityId: row.content_activity_id,
                name: row.content_activity_name,
                purpose: row.content_activity_purpose
            },
            createdAt: row.created_at,
            mine: row.mine === 1
        };
    }

    private mapMemberFromDB(row: any): ChatMember {
        return {
            userId: row.user_id,
            userName: row.user_name,
            avatarUrl: row.avatar_url,
            role: row.role,
            joinedAt: row.joined_at,
            isCurrentUser: row.is_current_user === 1
        };
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;










