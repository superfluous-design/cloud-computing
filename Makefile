# Start all services
up:
	docker-compose up --build -d

# Stop all services and remove only express image
down:
	docker-compose down -v --remove-orphans