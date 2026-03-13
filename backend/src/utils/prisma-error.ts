import { Prisma } from '@prisma/client';

export function handlePrismaError(e: unknown, context?: { entity?: string; field?: string }): never {
  const entity = context?.entity ?? 'Registro';
  const field = context?.field ?? 'campo';

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002':
        throw Object.assign(
          new Error(`${entity} já existe com este ${field}`),
          { statusCode: 409 }
        );
      case 'P2025':
        throw Object.assign(
          new Error(`${entity} não encontrado`),
          { statusCode: 404 }
        );
      case 'P2003':
        throw Object.assign(
          new Error(`Referência inválida: o ${field} informado não existe`),
          { statusCode: 400 }
        );
      case 'P2014':
        throw Object.assign(
          new Error(`Operação inválida: violação de relação entre registros`),
          { statusCode: 400 }
        );
    }
  }

  throw e;
}
