import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors'
import multipart from '@fastify/multipart';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const envSchema = z.object({
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().default('587'),
    SMTP_SECURE: z.string().default('false'),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    FROM_EMAIL: z.string().email(),
    FROM_NAME: z.string().default(''),
    PORT: z.string().default('3000'),
    HOST: z.string().default('0.0.0.0'),
});

const dataMailSchema = z.object({
    to: z.string(),
    subject: z.string(),
    text: z.string().optional(),
    html: z.string().optional(),
});

const env = envSchema.parse(process.env);

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

const fastify = Fastify();
fastify.register(cors, {
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
    ],
});
fastify.register(multipart);

fastify.get('/test', async (req, reply) => {
    await transporter.verify();
    return 'SMTP OK';
});

fastify.post('/mail', async (req, reply) => {
    try {

        let attachments: any[] = [];
        let formData: any = {};
        const parts = req.parts();
        for await (const part of parts) {
            if (part.type === 'file') {
                // await pipeline(part.file, fs.createWriteStream(part.filename));
                const fileBuffer = await part.toBuffer();
                attachments.push({
                    filename: part.filename,
                    content: fileBuffer,
                    contentType: part.mimetype
                });
            } else {
                // console.log(part);
                formData[part.fieldname] = part.value;
            }
        }

        const data = dataMailSchema.parse(formData);
    

        await transporter.sendMail({
            from: env.FROM_NAME ? `"${env.FROM_NAME}" <${env.FROM_EMAIL}>` : env.FROM_EMAIL, // sender address
            to: data.to,
            subject: data.subject,
            text: data.text,
            html: data.html,
            attachments: attachments,
        });

        return { success: true };
    } catch (err) {
        reply.status(500).send({ error: err });
    }
    return;
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
