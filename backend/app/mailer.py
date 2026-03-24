import smtplib
from email.message import EmailMessage
from fastapi import HTTPException, status

from app.config import settings


def send_smtp_email(to_email: str, subject: str, message: str) -> bool:
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg.set_content(message)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)

        return True

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP authentication failed. Check SMTP_USER / SMTP_PASS.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(exc)}",
        )