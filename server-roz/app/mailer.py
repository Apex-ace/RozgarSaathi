import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import HTTPException, status
from app.config import settings


def send_smtp_email(to_email: str, subject: str, message: str) -> None:
    mime_message = MIMEMultipart()
    mime_message["From"] = settings.SMTP_FROM
    mime_message["To"] = to_email
    mime_message["Subject"] = subject
    mime_message.attach(MIMEText(message, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, to_email, mime_message.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP authentication failed",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(exc)}",
        )