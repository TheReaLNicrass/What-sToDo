CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   

-- users
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP   NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_unique UNIQUE (email)
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
    id          UUID        NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id    UUID,
    created_at  TIMESTAMP   NOT NULL,
    deadline    TIMESTAMP,
    CONSTRAINT projects_pkey PRIMARY KEY (id),
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id)
        REFERENCES public.users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- project_members
CREATE TABLE IF NOT EXISTS public.project_members (
    project_id  UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    role        SMALLINT    NOT NULL,
    joined_at   TIMESTAMP   NOT NULL,
    CONSTRAINT fk_pm_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pm_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id)
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id          UUID        NOT NULL,
    project_id  UUID        NOT NULL,
    parent_id   UUID,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    priority    SMALLINT    NOT NULL,
    status      VARCHAR(50) NOT NULL,
    creator_id  UUID,
    deadline    TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_id)
        REFERENCES public.tasks (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (creator_id)
        REFERENCES public.users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- task_assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
    task_id     UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    assigned_at TIMESTAMP   NOT NULL,
    CONSTRAINT task_assignees_pkey PRIMARY KEY (task_id, user_id),
    CONSTRAINT fk_ta_task FOREIGN KEY (task_id)
        REFERENCES public.tasks (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ta_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Berechtigungen
GRANT ALL ON TABLE public.users TO dev;
GRANT ALL ON TABLE public.projects TO dev;
GRANT ALL ON TABLE public.project_members TO dev;
GRANT ALL ON TABLE public.tasks TO dev;
GRANT ALL ON TABLE public.task_assignees TO dev;