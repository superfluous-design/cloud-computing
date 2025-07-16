package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/slayer/autorestart"
	"github.com/superfluous-design/cloud-computing/auth/api/router"
	"github.com/superfluous-design/cloud-computing/auth/connection"
)
  
func main() {
	// Initialize database connection
	if err := connection.InitDatabase(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Shutting down gracefully...")
		connection.CloseDatabase()
		os.Exit(0)
	}()

	// Restart the server when the code changes
	autorestart.StartWatcher()

	// Start the server
	router.InitializeRoutes()
}