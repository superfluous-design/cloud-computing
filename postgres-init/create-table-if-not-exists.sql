CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- This table is now defined above with the correct schema

CREATE TYPE BMTYPE AS ENUM ('URL', 'Text', 'Color');

-- Drop the old bookmarks table if it exists and has the wrong schema
DROP TABLE IF EXISTS bookmarks CASCADE;

CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        folder_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        store_id VARCHAR(255) NOT NULL
);

-- Drop the old folders table if it exists and has the wrong schema
DROP TABLE IF EXISTS folders CASCADE;

CREATE TABLE IF NOT EXISTS folders (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
        log_id SERIAL PRIMARY KEY,
        service VARCHAR(255),
        content VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create LiveStore events table
CREATE TABLE IF NOT EXISTS livestore_events (
        id SERIAL PRIMARY KEY,
        store_id VARCHAR(255),
        event_name VARCHAR(255),
        event_data JSONB,
        event_number VARCHAR(255),
        client_id VARCHAR(255),
        session_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default user for testing
INSERT INTO users (user_id, email, password) 
VALUES (1, 'test@example.com', 'password123') 
ON CONFLICT (user_id) DO NOTHING;

-- Insert default folder for testing (using new schema)
INSERT INTO folders (id, name) 
VALUES ('default-folder', 'Default Folder') 
ON CONFLICT (id) DO NOTHING;
