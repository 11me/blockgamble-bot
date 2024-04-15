async function errorMiddleware(ctx, next) {
    try {
        await next(ctx);
    } catch(err) {
        console.error('error happened', err);
    }
}

module.exports = {
    errorMiddleware,
}
