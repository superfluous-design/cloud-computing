package router

import (
	"github.com/superfluous-design/cloud-computing/auth/api/handler"

	"github.com/gin-gonic/gin"
)

func InitializeRoutes() *gin.Engine {
	router := handler.Routes()
	router.Run()
	return router
}
