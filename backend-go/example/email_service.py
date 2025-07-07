from flask import render_template, current_app
from flask_mail import Message
from threading import Thread
from extensions import mail

def send_async_email(app, msg):
    """Envía un correo electrónico de forma asíncrona."""
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Error al enviar correo: {str(e)}")

def send_email(subject, sender, recipients, text_body, html_body=None, attachments=None, sync=False):
    """
    Envía un correo electrónico.

    Args:
        subject (str): Asunto del correo
        sender (str): Remitente
        recipients (list): Lista de destinatarios
        text_body (str): Cuerpo del correo en texto plano
        html_body (str, optional): Cuerpo del correo en HTML
        attachments (list, optional): Lista de tuplas (filename, content_type, data)
        sync (bool): Si es True, envía el correo de forma síncrona
    """
    msg = Message(subject, sender=sender, recipients=recipients)
    msg.body = text_body

    if html_body:
        msg.html = html_body

    if attachments:
        for attachment in attachments:
            msg.attach(*attachment)

    if sync:
        try:
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Error al enviar correo: {str(e)}")
            raise
    else:
        # Usar una copia de la aplicación actual para el hilo
        app = current_app._get_current_object()
        Thread(target=send_async_email, args=(app, msg)).start()

def send_welcome_email(user):
    """Envía un correo de bienvenida al usuario."""
    try:
        print(f"[TEST] Preparando envío de correo a: {user.email}")

        subject = "¡Prueba de correo desde la aplicación!"
        sender = current_app.config.get('MAIL_DEFAULT_SENDER')
        recipients = [user.email]

        print(f"[TEST] Configuración de correo:")
        print(f"[TEST] - Remitente: {sender}")
        print(f"[TEST] - Destinatario: {recipients[0]}")
        print(f"[TEST] - Servidor SMTP: {current_app.config.get('MAIL_SERVER')}:{current_app.config.get('MAIL_PORT')}")
        print(f"[TEST] - Usando SSL: {current_app.config.get('MAIL_USE_SSL')}")
        print(f"[TEST] - Usando TLS: {current_app.config.get('MAIL_USE_TLS')}")

        # Contenido simple para la prueba
        text_body = f"""
        Hola {user.first_name},

        Este es un correo de prueba desde la aplicación.

        Configuración usada:
        - Servidor: {current_app.config.get('MAIL_SERVER')}
        - Puerto: {current_app.config.get('MAIL_PORT')}
        - Usuario: {current_app.config.get('MAIL_USERNAME')}

        Si recibes este correo, ¡la configuración es correcta!
        """

        html_body = f"""
        <html>
            <body>
                <h1>¡Hola {user.first_name}!</h1>
                <p>Este es un correo de prueba desde la aplicación.</p>
                <h3>Configuración usada:</h3>
                <ul>
                    <li><strong>Servidor:</strong> {current_app.config.get('MAIL_SERVER')}</li>
                    <li><strong>Puerto:</strong> {current_app.config.get('MAIL_PORT')}</li>
                    <li><strong>Usuario:</strong> {current_app.config.get('MAIL_USERNAME')}</li>
                </ul>
                <p>Si recibes este correo, ¡la configuración es correcta!</p>
            </body>
        </html>
        """

        print("[TEST] Enviando correo...")

        # Enviar el correo de forma síncrona para ver errores inmediatos
        send_email(
            subject=subject,
            sender=sender,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sync=True
        )

        print("[TEST] Función send_email completada")
        return True

    except Exception as e:
        error_msg = f"Error en send_welcome_email: {str(e)}"
        print(f"[ERROR] {error_msg}")
        import traceback
        traceback.print_exc()  # Imprimir el traceback completo
        current_app.logger.error(error_msg)
        return False

def send_invoice_email(user, invoice):
    """Envía una factura por correo electrónico."""
    try:
        subject = f"Factura #{invoice.invoice_number}"
        sender = current_app.config['MAIL_DEFAULT_SENDER']
        recipients = [user.email]

        # Renderizar plantillas de correo
        text_body = render_template('emails/invoice.txt', user=user, invoice=invoice, config=current_app.config)
        html_body = render_template('emails/invoice.html', user=user, invoice=invoice, config=current_app.config)

        # Si tienes un PDF de la factura, puedes adjuntarlo así:
        # attachments = [
        #     (f"factura-{invoice.invoice_number}.pdf", "application/pdf", pdf_data)
        # ]

        send_email(subject, sender, recipients, text_body, html_body, attachments=None)
        return True
    except Exception as e:
        current_app.logger.error(f"Error en send_invoice_email: {str(e)}")
        return False


