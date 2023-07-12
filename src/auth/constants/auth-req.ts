import { FastifyRequest } from 'fastify';
import { Socket } from 'socket.io';
import { JwtPayload } from './jwt-payload';

export type AuthReq = FastifyRequest & { user: JwtPayload }; // return of AuthGuard in @Request

export type AuthSocket = Socket & { user: JwtPayload }; // return of AuthGuard in @Request
