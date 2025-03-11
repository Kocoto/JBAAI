import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Authentication API Documentation",
      version: "1.0.0",
      description: "API documentation for the authentication system",
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            username: {
              type: "string",
              description: "Username for login",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password",
              example: "StrongPassword123",
            },
            gender: {
              type: "string",
              enum: ["male", "female", "other"],
              description: "User gender",
              example: "male",
            },
            phone: {
              type: "string",
              description: "User phone number",
              example: "0123456789",
            },
            role: {
              type: "string",
              enum: ["admin", "user"],
              default: "user",
              description: "User role",
            },
            status: {
              type: "string",
              enum: ["active", "inactive"],
              default: "active",
              description: "User account status",
            },
            birthday: {
              type: "string",
              format: "date",
              description: "User birthday",
              example: "1990-01-01",
            },
            avatar: {
              type: "string",
              description: "URL to user avatar image",
            },
            address: {
              type: "string",
              description: "User address",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Account last update date",
            },
          },
          required: ["username", "email", "password", "gender", "phone"],
        },
        LoginCredentials: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "Email or username",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password",
              example: "StrongPassword123",
            },
            clientId: {
              type: "string",
              description: "Client identifier",
              example: "web-app-v1",
            },
          },
          required: ["email", "password", "clientId"],
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
                accessToken: {
                  type: "string",
                  description: "JWT access token",
                },
                refreshToken: {
                  type: "string",
                  description: "JWT refresh token",
                },
              },
            },
          },
        },
        RefreshToken: {
          type: "object",
          properties: {
            refreshToken: {
              type: "string",
              description: "Refresh token from previous login or refresh",
            },
            clientId: {
              type: "string",
              description: "Client identifier",
              example: "web-app-v1",
            },
          },
          required: ["refreshToken", "clientId"],
        },
        RefreshTokenResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            token: {
              type: "object",
              properties: {
                accessToken: {
                  type: "string",
                  description: "New JWT access token",
                },
                refreshToken: {
                  type: "string",
                  description: "New JWT refresh token",
                },
              },
            },
          },
        },
        Logout: {
          type: "object",
          properties: {
            clientId: {
              type: "string",
              description: "Client identifier",
              example: "web-app-v1",
            },
          },
          required: ["clientId"],
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
              example: "Unauthorized access",
            },
            stack: {
              type: "string",
              description: "Error stack trace (only in development)",
            },
          },
        },
      },
    },
  },
  apis: ["./src/app/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
