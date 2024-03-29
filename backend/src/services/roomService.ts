import prisma from "../prisma";

/**
 * Get all rooms
 */
export const getRooms = () => {
	return prisma.room.findMany({
		orderBy: {
			name: "asc",
		},
	});
}

/**
 * Get a single room
 */
export const getRoom = (roomId: string) => {
	return prisma.room.findUnique({
		where: {
			id: roomId,
		},
	});
}
