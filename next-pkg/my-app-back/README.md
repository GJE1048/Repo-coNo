# Backend Application

This is the backend application for the project, built using TypeScript and tRPC. It provides an API for managing users, documents, and AI shorthand records.

## Features

- Fetch dashboard statistics
- Retrieve user information
- Manage documents
- Access AI shorthand records

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd my-app-back
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm run dev
   ```

## API Endpoints

- **GET /api/trpc/dashboardStats**: Fetches dashboard statistics.
- **GET /api/trpc/users**: Retrieves a list of users with pagination and search functionality.
- **GET /api/trpc/documents**: Retrieves a list of documents with pagination and search functionality.
- **GET /api/trpc/aiShorthandRecords**: Retrieves a list of AI shorthand records with pagination.

## Development

- The application uses mock data for simulation purposes.
- TypeScript is used for type safety and better development experience.

## License

This project is licensed under the MIT License.