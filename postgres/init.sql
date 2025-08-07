CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
        folder_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        author_id INT REFERENCES users(user_id)
);

-- Bookmarks table with enhanced fields
CREATE TABLE IF NOT EXISTS bookmarks (
        bookmark_id VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('url', 'text', 'color')),
        title VARCHAR(500),
        url TEXT,
        folder_id VARCHAR(255) REFERENCES folders(folder_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        author_id INT REFERENCES users(user_id)
);

-- Create default user for testing
INSERT INTO users (user_id, email, password, created_at) 
VALUES (
    1, 
    'test@example.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
    NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Create default folder for existing users
INSERT INTO folders (folder_id, name, author_id) 
SELECT 'default-' || user_id::text, 'General', user_id 
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM folders WHERE author_id = users.user_id
);
