import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const result = await prisma.trade.deleteMany({
      where: {
        ticker: {
          startsWith: 'DUMMY'
        }
      }
    });
    console.log(`삭제된 DUMMY 티커 거래 수: ${result.count}`);
  } catch (error) {
    console.error('더미 거래 삭제 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
