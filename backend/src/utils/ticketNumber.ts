import prisma from "../lib/prisma.js";

export async function generateTicketNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `TKT-${currentYear}-`;

  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;
  if (latestTicket) {
    const parts = latestTicket.ticketNumber.split("-");
    const part2 = parts[2];
    if (part2) {
      const lastNum = parseInt(part2, 10);
      if (!isNaN(lastNum)) {
        nextSequence = lastNum + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}
