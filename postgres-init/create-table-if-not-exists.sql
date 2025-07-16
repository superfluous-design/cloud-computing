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

CREATE TYPE IF NOT EXISTS BMTYPE AS ENUM ('URL', 'Text', 'Color');

CREATE TABLE IF NOT EXISTS bookmarks (
        bookmark_id SERIAL PRIMARY KEY,
        type BMTYPE NOT NULL,
        content: VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        author_id REFERENCES users(user_id),
        folder_id REFERENCES folders(folder_id)
);

CREATE TABLE IF NOT EXISTS logs (
        log_id SERIAL PRIMARY KEY,
        service VARCHAR(255),
        content VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
