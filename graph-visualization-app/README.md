# Graph Visualization Application

This project is a client-server application designed for visualizing and working with directed graphs. It utilizes .NET for the backend, PostgreSQL for the database, and JavaScript/TypeScript for the frontend. The application is structured to allow easy integration with Docker and includes libraries for graph visualization such as Vis Network, D3.js, and others.

## Project Structure

```
graph-visualization-app
├── backend              # Backend application
│   ├── src
│   │   ├── Controllers  # API controllers
│   │   ├── Models       # Data models
│   │   └── Services     # Business logic
│   ├── appsettings.json # Configuration settings
│   ├── Dockerfile       # Dockerfile for backend
│   └── README.md        # Documentation for backend
├── frontend             # Frontend application
│   ├── public           # Public assets
│   ├── src
│   │   ├── components    # React components
│   │   └── types         # TypeScript types
│   ├── package.json     # NPM configuration
│   ├── tsconfig.json    # TypeScript configuration
│   ├── Dockerfile       # Dockerfile for frontend
│   └── README.md        # Documentation for frontend
├── db                   # Database scripts
│   ├── init.sql        # SQL initialization script
│   └── README.md        # Documentation for database
├── docker-compose.yml   # Docker Compose configuration
└── README.md            # General project documentation
```

## Features

- **Graph API**: The backend provides a RESTful API for creating and managing graph objects and relations.
- **Graph Visualization**: The frontend includes components for visualizing graphs using popular libraries.
- **Database Integration**: PostgreSQL is used for storing graph data, with initialization scripts provided.
- **Docker Support**: The application can be easily deployed using Docker.

## Getting Started

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd graph-visualization-app
   ```

2. **Set up the database**:
   - Configure the database connection in `backend/appsettings.json`.
   - Run the SQL scripts in `db/init.sql` to initialize the database.

3. **Build and run the application**:
   - Use Docker Compose to build and run the application:
   ```
   docker-compose up --build
   ```

4. **Access the application**:
   - The frontend will be available at `http://localhost:3000`.
   - The backend API can be accessed at `http://localhost:5000/api`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.