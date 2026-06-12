export const formatName = (user: any) => {
    if (user.firstName) return user.firstName;
    if (user.username) return `@${user.username}`;
    return 'Користувач';
};