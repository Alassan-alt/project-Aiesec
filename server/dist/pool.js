export function buildPrizePool(prizes) {
    const pool = [];
    for (const p of prizes) {
        for (let i = 0; i < p.baseCount; i++)
            pool.push(p.id);
    }
    return pool;
}
export function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const r = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
        const j = Math.floor(r * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
