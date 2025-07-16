package handler

import (
	"github.com/gin-gonic/gin"
)


func Routes() *gin.Engine {
	r := gin.Default()

	r.Use(gin.Recovery())


	api := r.Group("/api/v1/")
	{
		api.POST("/register", Register)
		api.POST("/login", Login)
	}

	return r
}
