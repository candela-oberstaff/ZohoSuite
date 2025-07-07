package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"gopkg.in/mail.v2"
)

// EmailConfig estructura para la configuración del servidor de correo
type EmailConfig struct {
	Server       string
	Port         int
	UseSSL       bool
	UseTLS       bool
	Username     string
	Password     string
	DefaultSender string
}

// LoadEmailConfig carga la configuración de correo desde las variables de entorno
func LoadEmailConfig() EmailConfig {
	port, _ := strconv.Atoi(os.Getenv("MAIL_PORT"))
	useSSL := os.Getenv("MAIL_USE_SSL") == "true"
	useTLS := os.Getenv("MAIL_USE_TLS") == "true"

	return EmailConfig{
		Server:       os.Getenv("MAIL_SERVER"),
		Port:         port,
		UseSSL:       useSSL,
		UseTLS:       useTLS,
		Username:     os.Getenv("MAIL_USERNAME"),
		Password:     os.Getenv("MAIL_PASSWORD"),
		DefaultSender: os.Getenv("MAIL_DEFAULT_SENDER"),
	}
}

// SendPaymentLinkEmail envía un correo electrónico con el enlace de pago al cliente
func SendPaymentLinkEmail(to, subject, customerName, paymentLink string) error {
	config := LoadEmailConfig()

	if config.Server == "" || config.Username == "" || config.Password == "" {
		return fmt.Errorf("configuración de correo incompleta")
	}

	m := mail.NewMessage()
	m.SetHeader("From", config.DefaultSender)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)

	// Crear el cuerpo del correo en HTML
	htmlBody := fmt.Sprintf(`
	<!DOCTYPE html>
	<html>
	<head>
		<meta charset="UTF-8">
		<title>Actualización de método de pago</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				line-height: 1.6;
				color: #333;
				margin: 0;
				padding: 20px;
			}
			.container {
				max-width: 600px;
				margin: 0 auto;
				background-color: #f9f9f9;
				padding: 20px;
				border-radius: 5px;
			}
			.header {
				text-align: center;
				padding-bottom: 10px;
				border-bottom: 1px solid #ddd;
			}
			.content {
				padding: 20px 0;
			}
			.button {
				display: inline-block;
				padding: 10px 20px;
				background-color: #4CAF50;
				color: white;
				text-decoration: none;
				border-radius: 5px;
				margin: 20px 0;
			}
			.footer {
				text-align: center;
				padding-top: 10px;
				border-top: 1px solid #ddd;
				font-size: 12px;
				color: #777;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h2>Actualización de método de pago</h2>
			</div>
			<div class="content">
				<p>Estimado/a %s,</p>
				<p>Gracias por su interés en nuestros servicios. Para completar su proceso de pago, por favor haga clic en el siguiente enlace:</p>
				<p style="text-align: center;">
					<a href="%s" class="button">Actualizar método de pago</a>
				</p>
				<p>Si el botón no funciona, puede copiar y pegar el siguiente enlace en su navegador:</p>
				<p>%s</p>
				<p>Este enlace expirará en 24 horas.</p>
				<p>Si tiene alguna pregunta, no dude en contactarnos.</p>
				<p>Saludos cordiales,</p>
				<p>El equipo de Geekers Team</p>
			</div>
			<div class="footer">
				<p>Este es un correo automático, por favor no responda a este mensaje.</p>
			</div>
		</div>
	</body>
	</html>
	`, customerName, paymentLink, paymentLink)

	m.SetBody("text/html", htmlBody)

	// Configurar el dialer para el servidor SMTP
	d := mail.NewDialer(config.Server, config.Port, config.Username, config.Password)
	d.SSL = config.UseSSL

	// Enviar el correo
	if err := d.DialAndSend(m); err != nil {
		log.Printf("Error al enviar correo: %v", err)
		return err
	}

	log.Printf("Correo enviado exitosamente a %s", to)
	return nil
}