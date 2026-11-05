import { NextResponse } from 'next/server';
import { route } from '@/lib/http';

export const GET = route(async () => NextResponse.json({
  openapi: '3.1.0',
  info: {
    title: 'SmartQ API',
    version: '1.0.0',
    description: 'Organization-scoped ticket API. All requests are restricted to the organization that issued the bearer key.',
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/tickets': {
      get: {
        summary: 'List organization tickets',
        parameters: [
          { in: 'query', name: 'before', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'beforeId', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'A paged list of tickets.' }, '401': { description: 'Missing or invalid key.' } },
      },
      post: {
        summary: 'Create a ticket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'reporter_name', 'reporter_email'],
                properties: {
                  title: { type: 'string', maxLength: 160 },
                  description: { type: 'string', maxLength: 4000 },
                  category: { type: 'string' },
                  urgency: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                  assigned_team: { type: 'string' },
                  system_impacted: { type: 'string' },
                  reporter_name: { type: 'string' },
                  reporter_email: { type: 'string', format: 'email' },
                  user_city: { type: 'string' },
                  user_phone: { type: 'string' },
                },
                additionalProperties: false,
              },
              examples: {
                ticket: {
                  summary: 'Create a support ticket',
                  value: {
                    title: 'VPN connection fails',
                    description: 'The VPN disconnects immediately after sign-in.',
                    category: 'Network & Connectivity',
                    urgency: 'High',
                    reporter_name: 'Alex Example',
                    reporter_email: 'alex@example.com',
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Ticket created.' }, '400': { description: 'Invalid ticket data.' } },
      },
    },
    '/tickets/{id}': {
      get: {
        summary: 'Get an organization ticket',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ticket details.' }, '404': { description: 'Ticket not found.' } },
      },
      patch: {
        summary: 'Update ticket status, urgency, team, or technician',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['Open', 'In Progress', 'Pending User', 'Resolved', 'Closed'] },
                  urgency: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                  assigned_team: { type: 'string' },
                  assigned_technician: { type: 'string' },
                },
                additionalProperties: false,
              },
              examples: {
                status: { summary: 'Update ticket status', value: { status: 'In Progress' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Ticket updated.' }, '404': { description: 'Ticket not found.' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Use an API key created in the organization management console. Required scopes: tickets:read, tickets:create, or tickets:update.',
      },
    },
  },
}));
