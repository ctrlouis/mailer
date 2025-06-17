import Fastify from 'fastify';
import cors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart';
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
fastify.register(fastifyMultipart);

fastify.get('/test', async (request, reply) => {
    await transporter.verify();
    return 'SMTP OK';
});

fastify.post('/mail', async (request, reply) => {
    try {

        const data = await request.file()

        if (!data || !data.to || !data.subject) {
            return reply.status(400).send({ error: 'to et subject requis' });
        }

        await transporter.sendMail({
            from: env.FROM_NAME ? `"${env.FROM_NAME}" <${env.FROM_EMAIL}>` : env.FROM_EMAIL, // sender address
            to: data.to,
            subject: data.subject,
            text: data.text,
            html: data.html,
            attachments: [
                {
                    filename: "bon-livraison.pdf",
                    content: data.attachement, // truncated
                    encoding: "base64",
                }
            ],
        });

        return { success: true };
    } catch (err) {
        reply.status(500).send({ error: 'Erreur lors de l\'envoi' });
    }
    return;
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
