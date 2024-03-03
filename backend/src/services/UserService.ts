import prisma from "../prisma";

export const getUsersInRoom = (roomId: string) => {
	return prisma.user.findMany({
		where: {
			roomId,
		},
		orderBy: {
			username: "asc",
		}
	});
}
