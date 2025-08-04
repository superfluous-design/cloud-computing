package handler

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/superfluous-design/cloud-computing/auth/connection"
	"golang.org/x/crypto/bcrypt"
)

type RegisterData struct {
	Email        string `json:"email" validate:"required"`
	Password     string `json:"password" validate:"required"`
}

type LoginData struct {
	Email        string `json:"email" validate:"required"`
	Password     string `json:"password" validate:"required"`
}

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Don't include password in JSON responses
	CreatedAt time.Time `json:"created_at"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
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

	// Check if user already exists
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingUser User
	err := db.QueryRow(ctx, "SELECT id, email FROM users WHERE email = $1", data.Email).Scan(&existingUser.ID, &existingUser.Email)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(data.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert new user
	var userID int
	err = db.QueryRow(ctx,
		"INSERT INTO users (email, password, created_at) VALUES ($1, $2, $3) RETURNING id",
		data.Email, string(hashedPassword), time.Now(),
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

func generateTokens(userID int, email string) (*TokenResponse, error) {
	// Get JWT secret from environment variable
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // Default for development
	}

	// Create access token (15 minutes)
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	})

	accessTokenString, err := accessToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, err
	}

	// Create refresh token (7 days)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	})

	refreshTokenString, err := refreshToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		TokenType:    "Bearer",
		ExpiresIn:    15 * 60, // 15 minutes in seconds
	}, nil
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

	// Find user by email
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	var hashedPassword string
	err := db.QueryRow(ctx,
		"SELECT id, email, password, created_at FROM users WHERE email = $1",
		data.Email,
	).Scan(&user.ID, &user.Email, &hashedPassword, &user.CreatedAt)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Compare password with hash
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(data.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate tokens
	tokens, err := generateTokens(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    user,
		"tokens":  tokens,
	})
}

type RefreshTokenData struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func RefreshToken(c *gin.Context) {
	var data RefreshTokenData

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get JWT secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key"
	}

	// Parse and validate refresh token
	token, err := jwt.ParseWithClaims(data.RefreshToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	// Generate new tokens
	tokens, err := generateTokens(claims.UserID, claims.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed successfully",
		"tokens":  tokens,
	})
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := authHeader
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		}

		// Get JWT secret
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "your-secret-key"
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Add user info to context
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)

		c.Next()
	}
}