import { Request, Response, NextFunction, RequestHandler } from 'express';
import { config } from '../../config';

export function cors(): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction): any {
    const allowedOrigins = [
      'https://play.twinleaf.gg',
      'http://play.twinleaf.gg',
      'https://beta.twinleaf.gg',
      'http://localhost:4200',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://beta-27qlv.ondigitalocean.app'
    ];
    const origin = req.headers.origin;
    if (config.backend.allowCors && origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
    res.header('Access-Control-Allow-Headers', [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Auth-Token'
    ].join(','));

    next();
  };
}
