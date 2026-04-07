import { Router } from 'express';
import { z } from 'zod';
import { collections } from '../db.js';
const router = Router();
async function getLockerWithPrize(token) {
    const { lockers, prizes } = collections();
    const locker = await lockers.findOne({ _id: token });
    if (!locker)
        return null;
    const prize = await prizes.findOne({ _id: locker.prizeId });
    if (!prize)
        return null;
    return { locker, prize };
}
router.get('/lockers/:token', async (req, res) => {
    const token = String(req.params.token || '').toUpperCase();
    if (token.length < 8)
        return res.status(404).json({ error: 'not_found' });
    const data = await getLockerWithPrize(token);
    if (!data)
        return res.status(404).json({ error: 'not_found' });
    const { locker, prize } = data;
    const isOpened = Boolean(locker.openedAt);
    return res.json({
        token,
        userName: locker.userName ?? null,
        openedAt: locker.openedAt ?? null,
        // Do not reveal the prize before opening.
        prize: isOpened
            ? {
                id: prize._id,
                label: prize.label,
                short: prize.short,
                imageUrl: prize.imageUrl ?? null,
            }
            : null,
    });
});
router.post('/lockers/:token/claim', async (req, res) => {
    const token = String(req.params.token || '').toUpperCase();
    const bodySchema = z.object({
        userName: z.string().trim().min(2).max(60),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'invalid_body' });
    const { lockers } = collections();
    const locker = await lockers.findOne({ _id: token });
    if (!locker)
        return res.status(404).json({ error: 'not_found' });
    if (locker.userName && locker.userName.trim().length > 0) {
        return res.json({ token, userName: locker.userName });
    }
    const r = await lockers.updateOne({
        _id: token,
        $or: [{ userName: { $exists: false } }, { userName: null }, { userName: '' }],
    }, { $set: { userName: parsed.data.userName, claimedAt: new Date() } });
    if (r.matchedCount === 0) {
        const again = await lockers.findOne({ _id: token });
        if (!again)
            return res.status(404).json({ error: 'not_found' });
        return res.json({ token, userName: again.userName ?? null });
    }
    return res.json({ token, userName: parsed.data.userName });
});
router.post('/lockers/:token/open', async (req, res) => {
    const token = String(req.params.token || '').toUpperCase();
    const bodySchema = z
        .object({
        selectedIdx: z.number().int().min(0).max(999).optional(),
    })
        .optional();
    const parsed = bodySchema?.safeParse(req.body);
    if (parsed && !parsed.success)
        return res.status(400).json({ error: 'invalid_body' });
    // Open exactly once.
    const { lockers, prizes } = collections();
    const locker = await lockers.findOne({ _id: token });
    if (!locker)
        return res.status(404).json({ error: 'not_found' });
    const prize = await prizes.findOne({ _id: locker.prizeId });
    if (!prize)
        return res.status(404).json({ error: 'not_found' });
    if (!locker.userName || locker.userName.trim().length === 0) {
        return res.status(409).json({ error: 'name_required' });
    }
    if (locker.openedAt) {
        return res.json({
            token,
            openedAt: locker.openedAt,
            userName: locker.userName ?? null,
            prize: {
                id: prize._id,
                label: prize.label,
                short: prize.short,
                imageUrl: prize.imageUrl ?? null,
            },
        });
    }
    try {
        const selectedIdx = parsed?.success ? parsed.data?.selectedIdx : undefined;
        const openedAt = new Date();
        const opened = await lockers.findOneAndUpdate({
            _id: token,
            $or: [{ openedAt: { $exists: false } }, { openedAt: null }],
        }, {
            $set: {
                openedAt,
                ...(typeof selectedIdx === 'number' ? { selectedIdx } : {}),
            },
        }, { returnDocument: 'after' });
        if (!opened) {
            throw new Error('not_opened');
        }
        return res.json({
            token,
            openedAt: opened.openedAt ?? null,
            userName: opened.userName ?? null,
            prize: {
                id: prize._id,
                label: prize.label,
                short: prize.short,
                imageUrl: prize.imageUrl ?? null,
            },
        });
    }
    catch {
        // In case of race conditions, re-fetch.
        const again = await lockers.findOne({ _id: token });
        if (!again)
            return res.status(404).json({ error: 'not_found' });
        if (!again.openedAt)
            return res.status(500).json({ error: 'open_failed' });
        return res.json({
            token,
            openedAt: again.openedAt,
            userName: again.userName ?? null,
            prize: {
                id: prize._id,
                label: prize.label,
                short: prize.short,
                imageUrl: prize.imageUrl ?? null,
            },
        });
    }
});
export default router;
