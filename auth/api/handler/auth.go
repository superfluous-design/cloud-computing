package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/superfluous-design/cloud-computing/auth/connection"
)

type RegisterData struct {
	Email        string `json:"email" validate:"required"`
	Password     string `json:"password" validate:"required"`
}

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Don't include password in JSON responses
	CreatedAt time.Time `json:"created_at"`
}

func Register(c *gin.Context) {
	var data RegisterData

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get database connection
	db := connection.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection not available"})
		return
	}

	// Example: Check if user already exists
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingUser User
	err := db.QueryRow(ctx, "SELECT id, email FROM users WHERE email = $1", data.Email).Scan(&existingUser.ID, &existingUser.Email)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Example: Insert new user (In production, hash the password!)
	var userID int
	err = db.QueryRow(ctx,
		"INSERT INTO users (email, password, created_at) VALUES ($1, $2, $3) RETURNING id",
		data.Email, data.Password, time.Now(),
	).Scan(&userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user_id": userID,
	})
}

type LoginData struct {
	Email        string `json:"email" validate:"required"`
	Password     string `json:"password" validate:"required"`
}

func Login(c *gin.Context) {
	var data LoginData

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get database connection
	db := connection.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection not available"})
		return
	}

	// Example: Find user by email and password (In production, compare hashed passwords!)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	err := db.QueryRow(ctx,
		"SELECT id, email, created_at FROM users WHERE email = $1 AND password = $2",
		data.Email, data.Password,
	).Scan(&user.ID, &user.Email, &user.CreatedAt)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    user,
	})
}