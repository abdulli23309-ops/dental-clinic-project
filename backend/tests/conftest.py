import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db_session
from app.core.security import hash_password
from app.domain.models.user import User, UserRole
from app.infrastructure.database.orm_models import Base
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository
from app.main import app, limiter

import logging

# Disable rate limiting in test suite so fast sequential tests aren't blocked by 429
limiter.enabled = False
logging.getLogger("aiosqlite").setLevel(logging.WARNING)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def test_session():
    """Provides an isolated in-memory SQLite session with all tables initialized."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        from app.infrastructure.database.orm_models import RoleORM
        import uuid
        default_roles = [
            ("Dentist", "Dentist", "General dental care and oral health", 1),
            ("Orthodontist", "Orthodontist", "Alignment of teeth and jaws", 2),
            ("Endodontist", "Endodontist", "Root canals and dental pulp therapy", 3),
            ("Periodontist", "Periodontist", "Gum diseases and dental implants", 4),
            ("Prosthodontist", "Prosthodontist", "Restoration and replacement of teeth", 5),
            ("Pediatric Dentist", "Pediatric Dentist", "Dental care for children and adolescents", 6),
            ("Oral Surgeon", "Oral Surgeon", "Surgical treatment of oral cavity and jaw", 7),
            ("Implantologist", "Implantologist", "Dental implants and bone augmentation", 8),
            ("Cosmetic Dentist", "Cosmetic Dentist", "Aesthetic and smile enhancement", 9),
            ("Hygienist", "Hygienist", "Preventative cleanings and periodontal hygiene", 10),
            ("Dental Assistant", "Dental Assistant", "Chairside clinical assisting and sterilization", 11),
            ("Receptionist", "Receptionist", "Front desk reception and patient coordination", 12),
            ("Practice Manager", "Practice Manager", "Clinic administration and operations management", 13),
        ]
        for name, display_name, description, order in default_roles:
            session.add(
                RoleORM(
                    id=uuid.uuid4(),
                    name=name,
                    display_name=display_name,
                    description=description,
                    display_order=order,
                    is_active=True,
                    is_system=False,
                )
            )
        await session.commit()
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client_with_db(test_session: AsyncSession):
    """An AsyncClient with the database dependency overridden to point to test_session."""
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db_session] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_db_session, None)


@pytest_asyncio.fixture
async def admin_auth(test_session: AsyncSession, client_with_db: AsyncClient):
    """Creates a test admin user and logs in, returning auth headers and client."""
    user_repo = PostgresUserRepository(test_session)
    admin_user = User(
        email="testadmin@marlowdental.com",
        hashed_password=hash_password("AdminTest123!"),
        full_name="Test Administrator",
        role=UserRole.ADMIN,
        is_active=True,
    )
    await user_repo.save(admin_user)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "testadmin@marlowdental.com", "password": "AdminTest123!"},
    )
    assert resp.status_code == 200
    token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    return {
        "headers": headers,
        "token": token,
        "client": client_with_db,
        "user": admin_user,
        "cookies": resp.cookies,
    }


@pytest_asyncio.fixture
async def receptionist_auth(test_session: AsyncSession, client_with_db: AsyncClient):
    """Creates a test receptionist user and logs in, returning auth headers and client."""
    user_repo = PostgresUserRepository(test_session)
    rec_user = User(
        email="testreceptionist@marlowdental.com",
        hashed_password=hash_password("Receptionist123!"),
        full_name="Test Receptionist",
        role=UserRole.RECEPTIONIST,
        is_active=True,
    )
    await user_repo.save(rec_user)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "testreceptionist@marlowdental.com", "password": "Receptionist123!"},
    )
    assert resp.status_code == 200
    token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    return {
        "headers": headers,
        "token": token,
        "client": client_with_db,
        "user": rec_user,
        "cookies": resp.cookies,
    }


@pytest_asyncio.fixture
async def doctor_auth(test_session: AsyncSession, client_with_db: AsyncClient):
    """Creates a test doctor user and logs in, returning auth headers and client."""
    from uuid import uuid4
    from app.domain.models.team_member import TeamMember
    from app.infrastructure.repositories.postgres_team_repo import PostgresTeamMemberRepository

    team_repo = PostgresTeamMemberRepository(test_session)
    doc_tm = TeamMember(
        organization_id=uuid4(),
        first_name="Test",
        last_name="Doctor",
        display_name="Dr. Test Doctor",
        professional_title="General Dentist",
        role="Doctor",
        is_active=True,
    )
    saved_tm = await team_repo.save(doc_tm)

    user_repo = PostgresUserRepository(test_session)
    doc_user = User(
        email="testdoctor@marlowdental.com",
        hashed_password=hash_password("DoctorTest123!"),
        full_name="Test Doctor",
        role=UserRole.DOCTOR,
        team_member_id=saved_tm.id,
        is_active=True,
    )
    await user_repo.save(doc_user)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "testdoctor@marlowdental.com", "password": "DoctorTest123!"},
    )
    assert resp.status_code == 200
    token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    return {
        "headers": headers,
        "token": token,
        "client": client_with_db,
        "user": doc_user,
        "team_member": saved_tm,
        "cookies": resp.cookies,
    }
