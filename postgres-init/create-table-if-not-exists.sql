CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS folders (
        folder_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        author_id INT REFERENCES users(user_id)
);

CREATE TYPE BMTYPE AS ENUM ('URL', 'Text', 'Color');

CREATE TABLE IF NOT EXISTS bookmarks (
        bookmark_id VARCHAR(255) PRIMARY KEY,
        type BMTYPE NOT NULL,
        content VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        author_id INT REFERENCES users(user_id),
        folder_id INT REFERENCES folders(folder_id)
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

-- Insert default user and folder for testing
INSERT INTO users (user_id, email, password) 
VALUES (1, 'test@example.com', 'password123') 
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO folders (folder_id, name, color, author_id) 
VALUES (1, 'Default Folder', '#3B82F6', 1) 
ON CONFLICT (folder_id) DO NOTHING;
