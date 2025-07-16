package handler

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)


func Routes() *gin.Engine {
	r := gin.Default()

	r.Use(gin.Recovery())


	api := r.Group("/api/v1/")
	{
		api.POST("/register", Register)
		api.POST("/login", Login)
		api.GET("/health", HealthCheck)
	}

	return r
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "OK", "name": os.Getenv("NAME")})
}