import express from 'express';
import * as serviceRegister from '../services/serviceManager';
import { AriaTrackService } from '../services/ariaTrackService';
import { RedisService } from '../services/redisService';
import authMiddleware from '../middlewares/authMiddleware';

const router = express.Router();
const ariaTrackService = serviceRegister.createGetter(AriaTrackService.ID);
const redisService = serviceRegister.createGetter(RedisService.ID);

const trackMapper = (track, timestamps) => {
    const data = {
        gid: track.gid,
        status: track.status,
        dir: track.dir,
        files: track.files.map(f => ({
            index: +f.index,
            path: f.path,
            uris: f.uris
        })),
        sizeTotal: +track.totalLength,
        sizeCompleted: +track.completedLength,
        pieceAmount: +track.numPieces,
        pieceSize: +track.pieceLength,
        bitfield: track.bitfield,
        connectionAmount: +track.connections,
        speedDown: +track.downloadSpeed,
        addedAt: timestamps.addedAt,
        elapsedTime: timestamps.elapsedTime
    };

    if (track.errorCode && track.errorCode > 0) {
        data.error = {
            code: +track.errorCode,
            message: track.errorMessage
        };
    }

    return data;
};

router.get('/show/:gid', authMiddleware, (req, res) => {
    const gid = req.params.gid;

    ariaTrackService().downloadByGid(gid).then(track => {
        return Promise.all([
            Promise.resolve(track),
            redisService().getTrack(gid)
        ]);

    }).then(([track, timestamps]) => {
        res.json(trackMapper(track, timestamps));

    }).catch(err => {
        res.status(404).json({
            error: true,
            code: 404,
            message: err.message || err
        });
    });
});

router.get('/list', authMiddleware, (req, res) => {

    ariaTrackService().allDownloads().then(tracks =>
        tracks.map(track =>
            redisService().getTrack(track.gid)
                .then(timestamps => [track, timestamps])
        )
    ).then(combined => {
        const data = combined
            .map(([track, timestamps]) => trackMapper(track, timestamps));

        res.json(data);
    });
});

export default router;
