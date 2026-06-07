import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env.js';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Lavey API',
      version: '1.0.0',
      description: 'Backend API for Lavey — auth, admin dashboard, profiles, matches, and messaging.',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            provider: { type: 'string', enum: ['google', 'email'] },
          },
        },
        AuthSession: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/AuthUser' },
          },
        },
        AdminAccount: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
          },
        },
        AdminAuthSession: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Admin JWT (Bearer)' },
            admin: { $ref: '#/components/schemas/AdminAccount' },
          },
        },
        AdminUserRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            handle: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatarUrl: { type: 'string', nullable: true },
            likes: { type: 'integer' },
            age: { type: 'integer', nullable: true },
            gender: { type: 'string' },
            totalMatches: { type: 'integer' },
            matches: { type: 'integer' },
            plan: { type: 'string', enum: ['Platinum', 'Free'] },
            lastSeen: { type: 'string' },
            subscribed: { type: 'boolean' },
            isNew: { type: 'boolean' },
            topUser: { type: 'boolean' },
          },
        },
        AdminUsersListResult: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: { $ref: '#/components/schemas/AdminUserRecord' },
            },
            summary: {
              type: 'object',
              properties: {
                activeUsers: { type: 'integer' },
                subscribedMembers: { type: 'integer' },
                highMatchUsers: { type: 'integer' },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'System', description: 'Health and diagnostics' },
      { name: 'Auth', description: 'App user authentication' },
      { name: 'Admin', description: 'Admin dashboard auth and member directory' },
    ],
  },
  apis: ['./src/controllers/*.ts', './src/routes/*.ts'],
});
