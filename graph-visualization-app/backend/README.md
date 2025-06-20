# Graph Visualization App - Backend

## Overview
This backend application is designed to provide an API for working with directed graphs. It allows for the creation of graph objects and relations, retrieval of properties, and pathfinding between objects.

## Structure
The backend is structured as follows:

- **Controllers**: Contains the `GraphController` which handles API requests related to graph operations.
- **Models**: Contains the data models representing graph objects and relations.
- **Services**: Contains the business logic for graph operations, implemented in the `GraphService`.
- **Program.cs**: The entry point of the application, responsible for setting up and running the web server.

## Technologies Used
- .NET for building the backend services.
- PostgreSQL for database management.
- Docker for containerization.

## Setup
1. Clone the repository.
2. Navigate to the `backend` directory.
3. Update the `appsettings.json` file with your PostgreSQL connection details.
4. Build the Docker image using the provided Dockerfile.
5. Run the application using Docker or directly through .NET.

## API Endpoints
- **POST /api/graphs**: Create a new graph object.
- **POST /api/relations**: Create a new relation between graph objects.
- **GET /api/graphs/{id}**: Retrieve properties of a specific graph object.
- **GET /api/relations/{id}**: Retrieve properties of a specific relation.
- **GET /api/paths**: Find paths between two graph objects.

## Database Initialization
The database schema can be initialized using the SQL scripts provided in the `db/init.sql` file.

## Contribution
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.