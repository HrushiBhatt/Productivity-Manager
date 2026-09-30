from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)


def utcnow():
    return datetime.now(timezone.utc)


class Preset(db.Model):
    """A saved custom timing mode, e.g. "Thesis 75/15"."""

    __tablename__ = "presets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(32))
    focus_min: Mapped[int]
    rest_min: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "focus": self.focus_min, "rest": self.rest_min}


class FocusSession(db.Model):
    """One focus block, logged when it ends (breaks are not logged)."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    mode: Mapped[str] = mapped_column(String(32))
    planned_sec: Mapped[int]
    focused_sec: Mapped[int]
    completed: Mapped[bool]  # ran to zero rather than ended early
    intention: Mapped[str] = mapped_column(String(140), default="")
    reflection: Mapped[str] = mapped_column(String(280), default="")
    distractions: Mapped[int] = mapped_column(default=0)
    # The client's local calendar day, so streaks follow the user's midnight, not UTC's.
    day: Mapped[str] = mapped_column(String(10), index=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "mode": self.mode,
            "planned": self.planned_sec,
            "focused": self.focused_sec,
            "completed": self.completed,
            "intention": self.intention,
            "reflection": self.reflection,
            "distractions": self.distractions,
            "day": self.day,
            # SQLite drops tzinfo on the way back out, so re-attach UTC.
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat(),
        }
