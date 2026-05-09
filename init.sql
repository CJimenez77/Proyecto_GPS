--
-- PostgreSQL database dump
--


-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_id_area_fkey;
ALTER TABLE IF EXISTS ONLY public.tareas DROP CONSTRAINT IF EXISTS tareas_id_usuario_asignado_fkey;
ALTER TABLE IF EXISTS ONLY public.tareas DROP CONSTRAINT IF EXISTS tareas_id_expediente_fkey;
ALTER TABLE IF EXISTS ONLY public.tareas DROP CONSTRAINT IF EXISTS tareas_id_etapa_fkey;
ALTER TABLE IF EXISTS ONLY public.respuestas_formulario DROP CONSTRAINT IF EXISTS respuestas_formulario_id_expediente_fkey;
ALTER TABLE IF EXISTS ONLY public.respuestas_formulario DROP CONSTRAINT IF EXISTS respuestas_formulario_id_campo_fkey;
ALTER TABLE IF EXISTS ONLY public.proyectos DROP CONSTRAINT IF EXISTS proyectos_id_area_fkey;
ALTER TABLE IF EXISTS ONLY public.procesos DROP CONSTRAINT IF EXISTS procesos_id_area_fkey;
ALTER TABLE IF EXISTS ONLY public.formularios DROP CONSTRAINT IF EXISTS formularios_id_proyecto_fkey;
ALTER TABLE IF EXISTS ONLY public.formularios DROP CONSTRAINT IF EXISTS formularios_id_disciplina_fkey;
ALTER TABLE IF EXISTS ONLY public.expedientes DROP CONSTRAINT IF EXISTS expedientes_subido_por_fkey;
ALTER TABLE IF EXISTS ONLY public.expedientes DROP CONSTRAINT IF EXISTS expedientes_id_proyecto_fkey;
ALTER TABLE IF EXISTS ONLY public.expedientes DROP CONSTRAINT IF EXISTS expedientes_id_expediente_padre_fkey;
ALTER TABLE IF EXISTS ONLY public.expedientes DROP CONSTRAINT IF EXISTS expedientes_id_disciplina_fkey;
ALTER TABLE IF EXISTS ONLY public.etapas DROP CONSTRAINT IF EXISTS etapas_id_revisor_fkey;
ALTER TABLE IF EXISTS ONLY public.etapas DROP CONSTRAINT IF EXISTS etapas_id_proceso_fkey;
ALTER TABLE IF EXISTS ONLY public.disciplinas DROP CONSTRAINT IF EXISTS disciplinas_id_proyecto_fkey;
ALTER TABLE IF EXISTS ONLY public.campos_formulario DROP CONSTRAINT IF EXISTS campos_formulario_id_formulario_fkey;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_id_empresa_fkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_username_key;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE IF EXISTS ONLY public.tareas DROP CONSTRAINT IF EXISTS tareas_pkey;
ALTER TABLE IF EXISTS ONLY public.respuestas_formulario DROP CONSTRAINT IF EXISTS respuestas_formulario_pkey;
ALTER TABLE IF EXISTS ONLY public.proyectos DROP CONSTRAINT IF EXISTS proyectos_pkey;
ALTER TABLE IF EXISTS ONLY public.procesos DROP CONSTRAINT IF EXISTS procesos_pkey;
ALTER TABLE IF EXISTS ONLY public.formularios DROP CONSTRAINT IF EXISTS formularios_pkey;
ALTER TABLE IF EXISTS ONLY public.expedientes DROP CONSTRAINT IF EXISTS expedientes_pkey;
ALTER TABLE IF EXISTS ONLY public.etapas DROP CONSTRAINT IF EXISTS etapas_pkey;
ALTER TABLE IF EXISTS ONLY public.empresas DROP CONSTRAINT IF EXISTS empresas_pkey;
ALTER TABLE IF EXISTS ONLY public.disciplinas DROP CONSTRAINT IF EXISTS disciplinas_pkey;
ALTER TABLE IF EXISTS ONLY public.campos_formulario DROP CONSTRAINT IF EXISTS campos_formulario_pkey;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_pkey;
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.tareas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.respuestas_formulario ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.proyectos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.procesos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.formularios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expedientes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.etapas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.empresas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.disciplinas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.campos_formulario ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.areas ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.usuarios_id_seq;
DROP TABLE IF EXISTS public.usuarios;
DROP SEQUENCE IF EXISTS public.tareas_id_seq;
DROP TABLE IF EXISTS public.tareas;
DROP SEQUENCE IF EXISTS public.respuestas_formulario_id_seq;
DROP TABLE IF EXISTS public.respuestas_formulario;
DROP SEQUENCE IF EXISTS public.proyectos_id_seq;
DROP TABLE IF EXISTS public.proyectos;
DROP SEQUENCE IF EXISTS public.procesos_id_seq;
DROP TABLE IF EXISTS public.procesos;
DROP SEQUENCE IF EXISTS public.formularios_id_seq;
DROP TABLE IF EXISTS public.formularios;
DROP SEQUENCE IF EXISTS public.expedientes_id_seq;
DROP TABLE IF EXISTS public.expedientes;
DROP SEQUENCE IF EXISTS public.etapas_id_seq;
DROP TABLE IF EXISTS public.etapas;
DROP SEQUENCE IF EXISTS public.empresas_id_seq;
DROP TABLE IF EXISTS public.empresas;
DROP SEQUENCE IF EXISTS public.disciplinas_id_seq;
DROP TABLE IF EXISTS public.disciplinas;
DROP SEQUENCE IF EXISTS public.campos_formulario_id_seq;
DROP TABLE IF EXISTS public.campos_formulario;
DROP SEQUENCE IF EXISTS public.areas_id_seq;
DROP TABLE IF EXISTS public.areas;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    id_empresa integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: campos_formulario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campos_formulario (
    id integer NOT NULL,
    id_formulario integer NOT NULL,
    nombre character varying(100) NOT NULL,
    etiqueta character varying(200) NOT NULL,
    tipo character varying(20) NOT NULL,
    opciones jsonb,
    requerido boolean DEFAULT false NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campos_formulario_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['texto'::character varying, 'numero'::character varying, 'fecha'::character varying, 'lista'::character varying, 'checkbox'::character varying, 'archivo'::character varying])::text[])))
);


--
-- Name: campos_formulario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campos_formulario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campos_formulario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campos_formulario_id_seq OWNED BY public.campos_formulario.id;


--
-- Name: disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinas (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    id_proyecto integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: disciplinas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disciplinas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disciplinas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disciplinas_id_seq OWNED BY public.disciplinas.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    rut character varying(20),
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: etapas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etapas (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    orden integer NOT NULL,
    id_proceso integer NOT NULL,
    id_revisor integer,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: etapas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.etapas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: etapas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.etapas_id_seq OWNED BY public.etapas.id;


--
-- Name: expedientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expedientes (
    id integer NOT NULL,
    titulo character varying(300) NOT NULL,
    id_proyecto integer NOT NULL,
    id_disciplina integer NOT NULL,
    subido_por integer NOT NULL,
    archivo_key character varying(500) NOT NULL,
    nombre_archivo character varying(300) NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    id_expediente_padre integer,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: expedientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expedientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expedientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expedientes_id_seq OWNED BY public.expedientes.id;


--
-- Name: formularios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formularios (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    id_proyecto integer,
    id_disciplina integer,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: formularios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.formularios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: formularios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.formularios_id_seq OWNED BY public.formularios.id;


--
-- Name: procesos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procesos (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    id_area integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: procesos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procesos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procesos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.procesos_id_seq OWNED BY public.procesos.id;


--
-- Name: proyectos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyectos (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    id_area integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: proyectos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proyectos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proyectos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proyectos_id_seq OWNED BY public.proyectos.id;


--
-- Name: respuestas_formulario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respuestas_formulario (
    id integer NOT NULL,
    id_expediente integer NOT NULL,
    id_campo integer NOT NULL,
    valor text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: respuestas_formulario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.respuestas_formulario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: respuestas_formulario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.respuestas_formulario_id_seq OWNED BY public.respuestas_formulario.id;


--
-- Name: tareas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tareas (
    id integer NOT NULL,
    id_expediente integer NOT NULL,
    id_usuario_asignado integer NOT NULL,
    id_etapa integer,
    estado character varying(20) DEFAULT 'ABIERTA'::character varying NOT NULL,
    comentario text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tareas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tareas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tareas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tareas_id_seq OWNED BY public.tareas.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    nombre character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    rol character varying(30) DEFAULT 'lector'::character varying NOT NULL,
    id_area integer,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: campos_formulario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campos_formulario ALTER COLUMN id SET DEFAULT nextval('public.campos_formulario_id_seq'::regclass);


--
-- Name: disciplinas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas ALTER COLUMN id SET DEFAULT nextval('public.disciplinas_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: etapas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas ALTER COLUMN id SET DEFAULT nextval('public.etapas_id_seq'::regclass);


--
-- Name: expedientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes ALTER COLUMN id SET DEFAULT nextval('public.expedientes_id_seq'::regclass);


--
-- Name: formularios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formularios ALTER COLUMN id SET DEFAULT nextval('public.formularios_id_seq'::regclass);


--
-- Name: procesos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos ALTER COLUMN id SET DEFAULT nextval('public.procesos_id_seq'::regclass);


--
-- Name: proyectos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos ALTER COLUMN id SET DEFAULT nextval('public.proyectos_id_seq'::regclass);


--
-- Name: respuestas_formulario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas_formulario ALTER COLUMN id SET DEFAULT nextval('public.respuestas_formulario_id_seq'::regclass);


--
-- Name: tareas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas ALTER COLUMN id SET DEFAULT nextval('public.tareas_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.areas (id, nombre, id_empresa, estado, created_at, updated_at) FROM stdin;
7	Area Base	7	activo	2026-05-08 23:17:31.225343	2026-05-08 23:17:31.225343
8	Area Ingenieria Civil	8	activo	2026-05-08 23:17:32.074432	2026-05-08 23:17:32.074432
9	Area Editada OK	8	activo	2026-05-09 03:54:10.648579	2026-05-09 03:54:30.257216
15	├ürea Operaciones	7	activo	2026-05-09 17:47:00.533978	2026-05-09 17:47:00.533978
18	├ürea Gesti├│n	10	activo	2026-05-09 17:47:00.533978	2026-05-09 17:47:00.533978
19	├ürea Calidad	10	activo	2026-05-09 17:47:00.533978	2026-05-09 17:47:00.533978
16	├ürea Infraestructura	9	inactivo	2026-05-09 17:47:00.533978	2026-05-09 17:53:28.415404
17	├ürea Tecnolog├¡a	9	inactivo	2026-05-09 17:47:00.533978	2026-05-09 17:53:29.894176
\.


--
-- Data for Name: campos_formulario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.campos_formulario (id, id_formulario, nombre, etiqueta, tipo, opciones, requerido, orden, created_at) FROM stdin;
24	6	campo_1	Numero de Plano	texto	\N	t	1	2026-05-09 04:12:00.984129
25	6	campo_2	Fase del Proyecto	lista	["Diseno", "Construccion", "Cierre"]	f	2	2026-05-09 04:12:00.984129
26	6	campo_3	Fecha de Emision	fecha	\N	t	3	2026-05-09 04:12:00.984129
27	7	campo_1	Campo Global 1	texto	\N	f	1	2026-05-09 04:14:17.470081
38	12	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
39	13	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
40	14	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
41	15	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
42	16	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
43	17	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
44	18	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
45	19	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
46	20	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
47	21	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
48	22	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
49	23	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
50	24	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
51	25	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
52	26	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
53	27	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
54	28	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
55	29	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
56	30	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
57	31	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
58	32	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
59	33	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
60	34	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
61	35	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
62	36	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
63	37	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
64	38	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
65	39	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
66	40	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
67	41	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
68	42	num_doc	Numero de Documento	texto	\N	t	1	2026-05-09 17:51:00.515348
69	7	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
70	12	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
71	13	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
72	14	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
73	15	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
74	16	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
75	17	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
76	18	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
77	19	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
78	20	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
79	21	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
80	22	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
81	23	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
82	24	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
83	25	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
84	26	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
85	27	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
86	28	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
87	29	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
88	30	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
89	31	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
90	32	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
91	33	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
92	34	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
93	35	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
94	36	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
95	37	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
96	38	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
97	39	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
98	40	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
99	41	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
100	42	revision	Revision	lista	["A", "B", "C", "0", "1", "2"]	t	2	2026-05-09 17:51:00.533274
101	7	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
102	12	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
103	13	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
104	14	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
105	15	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
106	16	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
107	17	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
108	18	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
109	19	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
110	20	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
111	21	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
112	22	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
113	23	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
114	24	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
115	25	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
116	26	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
117	27	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
118	28	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
119	29	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
120	30	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
121	31	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
122	32	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
123	33	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
124	34	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
125	35	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
126	36	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
127	37	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
128	38	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
129	39	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
130	40	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
131	41	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
132	42	fecha_emision	Fecha de Emision	fecha	\N	t	3	2026-05-09 17:51:00.543763
133	6	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
134	7	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
135	12	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
136	13	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
137	14	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
138	15	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
139	16	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
140	17	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
141	18	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
142	19	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
143	20	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
144	21	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
145	22	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
146	23	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
147	24	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
148	25	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
149	26	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
150	27	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
151	28	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
152	29	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
153	30	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
154	31	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
155	32	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
156	33	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
157	34	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
158	35	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
159	36	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
160	37	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
161	38	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
162	39	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
163	40	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
164	41	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
165	42	observaciones	Observaciones	texto	\N	f	4	2026-05-09 17:51:00.550028
166	5	numero_plano	Numero de Plano	texto	\N	t	1	2026-05-09 19:15:33.00639
167	5	revision	Revision	lista	["A", "B", "C", "D"]	t	2	2026-05-09 19:15:33.00639
168	5	fecha_emision	Fecha Emision	fecha	\N	t	3	2026-05-09 19:15:33.00639
169	5	observaciones	Observaciones	texto	\N	f	4	2026-05-09 19:15:33.00639
\.


--
-- Data for Name: disciplinas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.disciplinas (id, nombre, id_proyecto, estado, created_at, updated_at) FROM stdin;
5	Mecanica	5	activo	2026-05-08 23:17:32.186355	2026-05-08 23:17:32.186355
6	Disciplina Test CRUD	5	activo	2026-05-09 03:55:53.281239	2026-05-09 03:55:53.281239
37	Civil	6	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
38	El├®ctrica	6	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
39	Mec├ínica	21	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
40	Instrumentaci├│n	21	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
41	Estructural	24	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
42	Geot├®cnica	24	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
43	Arquitectura	25	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
44	Instalaciones	25	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
45	Urbanismo	26	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
46	Medioambiente	26	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
47	Transporte	22	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
48	Almacenamiento	22	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
49	Inventario	23	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
50	Distribuci├│n	23	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
51	Ingenier├¡a Civil	27	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
52	Hidr├íulica	27	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
53	Pavimentos	28	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
54	Se├▒al├®tica	28	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
55	Desarrollo	29	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
56	Integraci├│n	29	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
57	UX/UI	30	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
58	Backend	30	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
59	Licitaciones	31	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
60	Contratos	31	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
61	Finanzas	32	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
62	Cumplimiento	32	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
63	Documentaci├│n	33	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
64	Capacitaci├│n	33	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
65	Procedimientos	34	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
66	Indicadores	34	activo	2026-05-09 17:49:09.911196	2026-05-09 17:49:09.911196
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empresas (id, nombre, rut, estado, created_at, updated_at) FROM stdin;
7	Empresa Base	11.111.111-1	activo	2026-05-08 23:17:31.167644	2026-05-08 23:17:31.167644
8	Constructora Sur S.A.	76.123.456-7	activo	2026-05-08 23:17:32.021523	2026-05-08 23:17:32.021523
9	Empresa Editada OK	11.222.333-4	inactivo	2026-05-09 03:52:48.051846	2026-05-09 03:53:23.347118
10	Empresa E2E Test	99.999.999-9	activo	2026-05-09 17:24:35.844414	2026-05-09 17:24:35.844414
\.


--
-- Data for Name: etapas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.etapas (id, nombre, orden, id_proceso, id_revisor, estado, created_at, updated_at) FROM stdin;
5	Revision Inicial	1	5	18	activo	2026-05-08 23:17:32.493368	2026-05-08 23:17:32.493368
\.


--
-- Data for Name: expedientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expedientes (id, titulo, id_proyecto, id_disciplina, subido_por, archivo_key, nombre_archivo, estado, id_expediente_padre, version, created_at, updated_at) FROM stdin;
4	Plano Mecanico PM-001	5	5	19	ea94751a-8311-4870-8143-1eab9d3ec80d	doc_prueba.txt	APROBADO	\N	1	2026-05-08 23:17:33.069985	2026-05-08 23:17:33.477138
5	Plano Mecanico PM-002 con errores	5	5	19	34a38ac2-5050-4693-aec4-66116bd867ee	doc_prueba2.txt	RECHAZADO	\N	1	2026-05-08 23:17:33.574009	2026-05-08 23:17:33.813373
6	Plano PM-002 corregido	5	5	19	aa008bc2-d188-4b1d-9cf9-0d43c4e7f011	doc_corregido.txt	RECHAZADO	5	2	2026-05-08 23:17:33.887353	2026-05-09 16:11:30.747704
8	nuevo expediente de prueba	5	5	1	24ca53d7-5550-4e61-b45b-97f2d59a77a2	Clase12_GPS (1).pdf	APROBADO	\N	1	2026-05-09 15:21:33.215681	2026-05-09 17:23:03.785327
9	hdjfhsdjfhkdf	21	39	1	4ad4cbf6-b858-4a4c-ae27-9371007a215e	Clase12_GPS (1) (1).pdf	PENDIENTE	\N	1	2026-05-09 19:16:06.839548	2026-05-09 19:16:06.839548
7	Test Admin Upload	5	5	1	e1dc206d-3eab-4de3-b574-05c50f5b5493	dummy.txt	RECHAZADO	\N	1	2026-05-09 15:19:37.13845	2026-05-09 19:17:08.227967
\.


--
-- Data for Name: formularios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.formularios (id, nombre, id_proyecto, id_disciplina, estado, created_at, updated_at) FROM stdin;
6	Formulario Mecanica EDITADO	5	6	activo	2026-05-09 04:11:31.599889	2026-05-09 04:12:00.984129
7	Formulario Global Test	\N	\N	activo	2026-05-09 04:14:17.470081	2026-05-09 04:14:17.470081
12	Formulario Documento General	\N	\N	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
13	Form. Proyecto Test CRUD - Civil	6	37	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
14	Form. Proyecto Test CRUD - El├®ctrica	6	38	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
15	Form. Proyecto Mantenci├│n Norte - Mec├ínica	21	39	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
16	Form. Proyecto Mantenci├│n Norte - Instrumentaci├│n	21	40	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
17	Form. Proyecto Puente Los Andes - Estructural	24	41	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
18	Form. Proyecto Puente Los Andes - Geot├®cnica	24	42	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
19	Form. Proyecto Edificio Comercial A - Arquitectura	25	43	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
20	Form. Proyecto Edificio Comercial A - Instalaciones	25	44	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
21	Form. Proyecto Parque Industrial B - Urbanismo	26	45	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
22	Form. Proyecto Parque Industrial B - Medioambiente	26	46	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
23	Form. Proyecto Log├¡stica Sur - Transporte	22	47	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
24	Form. Proyecto Log├¡stica Sur - Almacenamiento	22	48	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
25	Form. Proyecto Bodega Central - Inventario	23	49	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
26	Form. Proyecto Bodega Central - Distribuci├│n	23	50	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
27	Form. Proyecto T├║nel Costero - Ingenier├¡a Civil	27	51	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
28	Form. Proyecto T├║nel Costero - Hidr├íulica	27	52	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
29	Form. Proyecto Autopista Central - Pavimentos	28	53	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
30	Form. Proyecto Autopista Central - Se├▒al├®tica	28	54	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
31	Form. Proyecto Sistema ERP - Desarrollo	29	55	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
32	Form. Proyecto Sistema ERP - Integraci├│n	29	56	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
33	Form. Proyecto Portal Digital - UX/UI	30	57	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
34	Form. Proyecto Portal Digital - Backend	30	58	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
35	Form. Proyecto Gesti├│n Contratos - Licitaciones	31	59	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
36	Form. Proyecto Gesti├│n Contratos - Contratos	31	60	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
37	Form. Proyecto Auditor├¡a Interna - Finanzas	32	61	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
38	Form. Proyecto Auditor├¡a Interna - Cumplimiento	32	62	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
39	Form. Proyecto ISO 9001 - Documentaci├│n	33	63	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
40	Form. Proyecto ISO 9001 - Capacitaci├│n	33	64	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
41	Form. Proyecto Control Procesos - Procedimientos	34	65	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
42	Form. Proyecto Control Procesos - Indicadores	34	66	activo	2026-05-09 17:50:07.711618	2026-05-09 17:50:07.711618
5	Formulario MecanicaX	\N	\N	activo	2026-05-08 23:17:32.894186	2026-05-09 19:15:33.00639
\.


--
-- Data for Name: procesos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procesos (id, nombre, id_area, estado, created_at, updated_at) FROM stdin;
5	Proceso Estandar	8	activo	2026-05-08 23:17:32.289313	2026-05-08 23:17:32.289313
\.


--
-- Data for Name: proyectos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proyectos (id, nombre, descripcion, id_area, estado, created_at, updated_at) FROM stdin;
5	Proyecto Ruta 5	Tramo sur	8	activo	2026-05-08 23:17:32.130376	2026-05-08 23:17:32.130376
6	Proyecto Test CRUD	Descripcion de prueba	7	activo	2026-05-09 03:55:03.753559	2026-05-09 03:55:03.753559
21	Proyecto Mantenci├│n Norte	Trabajos mantenci├│n zona norte	7	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
22	Proyecto Log├¡stica Sur	Gesti├│n log├¡stica zona sur	15	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
23	Proyecto Bodega Central	Administraci├│n bodega central	15	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
24	Proyecto Puente Los Andes	Construcci├│n puente vial Los Andes	8	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
25	Proyecto Edificio Comercial A	Edificio comercial zona A	9	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
26	Proyecto Parque Industrial B	Parque industrial zona B	9	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
27	Proyecto T├║nel Costero	Infraestructura t├║nel costero	16	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
28	Proyecto Autopista Central	Extensi├│n autopista central	16	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
29	Proyecto Sistema ERP	Implementaci├│n sistema ERP	17	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
30	Proyecto Portal Digital	Desarrollo portal clientes	17	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
31	Proyecto Gesti├│n Contratos	Sistema gesti├│n de contratos	18	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
32	Proyecto Auditor├¡a Interna	Proceso auditor├¡a interna	18	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
33	Proyecto ISO 9001	Certificaci├│n ISO 9001:2015	19	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
34	Proyecto Control Procesos	Estandarizaci├│n control procesos	19	activo	2026-05-09 17:48:02.978233	2026-05-09 17:48:02.978233
\.


--
-- Data for Name: respuestas_formulario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.respuestas_formulario (id, id_expediente, id_campo, valor, created_at) FROM stdin;
\.


--
-- Data for Name: tareas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tareas (id, id_expediente, id_usuario_asignado, id_etapa, estado, comentario, created_at, updated_at) FROM stdin;
4	4	18	5	APROBADA	Documento correcto, aprobado.	2026-05-08 23:17:33.069985	2026-05-08 23:17:33.477138
5	5	18	5	RECHAZADA	Formato de plano incorrecto, revisar.	2026-05-08 23:17:33.574009	2026-05-08 23:17:33.813373
6	6	18	5	RECHAZADA	tienes que hacer x cosas para poder aprobar esto	2026-05-08 23:17:33.887353	2026-05-09 16:11:30.747704
8	8	18	5	APROBADA	Todo correcto en el test E2E. Aprobar.	2026-05-09 16:17:41.590668	2026-05-09 17:23:03.785327
7	7	18	5	RECHAZADA	rechazado por q falta x cosa	2026-05-09 16:17:41.590668	2026-05-09 19:17:08.227967
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, username, password, nombre, email, rol, id_area, estado, created_at, updated_at) FROM stdin;
21	jperez	$2b$10$hVS3s9EhJAojYNiDWXKQpuEkgsRsi0DFbF8Lj7wsczx9otN3IHn9O	Juan P	jperez@test.com	lector	7	inactivo	2026-05-09 03:39:17.833929	2026-05-09 03:39:28.852271
1	admin	$2b$10$yvqsx8zVGuZUwTmW3TUsy.ppGUln7K7PQBB38IYn/yIvC1JVvZPoO	Administrador	admin@gps.cl	administrador	\N	activo	2026-05-08 23:01:20.353531	2026-05-08 23:01:20.353531
22	revisor_test	$2b$10$ZZOd/jcd7BvNi3Ej15VzOevFUu9H9Lf3YuT4os2mBCotq/AcB6RMe	Test Revisor	revisor@test.com	usuario_terreno	7	activo	2026-05-09 15:52:56.366175	2026-05-09 15:52:56.366175
23	test_revisor_2	$2b$10$/4nWNvYASR2RhZIjQQXsXO/jVo4ZlhVrkyQ7YLV9QkDpCHG6ZBzsi	Test Revisor 2	revisor2@test.com	revisor	7	activo	2026-05-09 15:53:52.092094	2026-05-09 15:53:52.092094
24	test_lector_2	$2b$10$aQuZ6K0Ow9yvjEOn19FC.efgwB2KBQcYzkznM.L9m3oAWdfkfojiu	Test Lector 2	lector2@test.com	lector	7	activo	2026-05-09 15:55:59.344571	2026-05-09 15:55:59.344571
18	juan_revisor	$2b$10$G6kz1t0N53Y0oDagKgsaneJJGYGZ.Z33J6t3BCtuXf18Qkp7goXEa	Juan Revisor	revisor@gps.cl	revisor	8	activo	2026-05-08 23:17:31.370327	2026-05-08 23:17:32.342109
19	pedro_terreno	$2b$10$G6kz1t0N53Y0oDagKgsaneJJGYGZ.Z33J6t3BCtuXf18Qkp7goXEa	Pedro Terreno	terreno@gps.cl	usuario_terreno	8	activo	2026-05-08 23:17:31.45811	2026-05-08 23:17:32.393044
20	maria_lectora	$2b$10$G6kz1t0N53Y0oDagKgsaneJJGYGZ.Z33J6t3BCtuXf18Qkp7goXEa	Maria Lectora	lector@gps.cl	lector	8	activo	2026-05-08 23:17:31.540457	2026-05-08 23:17:32.440965
25	teste2e	$2b$10$.KgFnxnf7s0XzQUSlADYJeHeJKmMJAgzavDeDMGAIMYO37Cx2ymZW	Test E2E	teste2e@test.com	usuario_terreno	7	inactivo	2026-05-09 17:23:51.064359	2026-05-09 17:24:08.424652
\.


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.areas_id_seq', 19, true);


--
-- Name: campos_formulario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.campos_formulario_id_seq', 169, true);


--
-- Name: disciplinas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.disciplinas_id_seq', 66, true);


--
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empresas_id_seq', 10, true);


--
-- Name: etapas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.etapas_id_seq', 5, true);


--
-- Name: expedientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expedientes_id_seq', 9, true);


--
-- Name: formularios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.formularios_id_seq', 42, true);


--
-- Name: procesos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.procesos_id_seq', 5, true);


--
-- Name: proyectos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proyectos_id_seq', 34, true);


--
-- Name: respuestas_formulario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.respuestas_formulario_id_seq', 2, true);


--
-- Name: tareas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tareas_id_seq', 8, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 25, true);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: campos_formulario campos_formulario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campos_formulario
    ADD CONSTRAINT campos_formulario_pkey PRIMARY KEY (id);


--
-- Name: disciplinas disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: etapas etapas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas
    ADD CONSTRAINT etapas_pkey PRIMARY KEY (id);


--
-- Name: expedientes expedientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_pkey PRIMARY KEY (id);


--
-- Name: formularios formularios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formularios
    ADD CONSTRAINT formularios_pkey PRIMARY KEY (id);


--
-- Name: procesos procesos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos
    ADD CONSTRAINT procesos_pkey PRIMARY KEY (id);


--
-- Name: proyectos proyectos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_pkey PRIMARY KEY (id);


--
-- Name: respuestas_formulario respuestas_formulario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas_formulario
    ADD CONSTRAINT respuestas_formulario_pkey PRIMARY KEY (id);


--
-- Name: tareas tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: areas areas_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id);


--
-- Name: campos_formulario campos_formulario_id_formulario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campos_formulario
    ADD CONSTRAINT campos_formulario_id_formulario_fkey FOREIGN KEY (id_formulario) REFERENCES public.formularios(id) ON DELETE CASCADE;


--
-- Name: disciplinas disciplinas_id_proyecto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyectos(id);


--
-- Name: etapas etapas_id_proceso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas
    ADD CONSTRAINT etapas_id_proceso_fkey FOREIGN KEY (id_proceso) REFERENCES public.procesos(id);


--
-- Name: etapas etapas_id_revisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas
    ADD CONSTRAINT etapas_id_revisor_fkey FOREIGN KEY (id_revisor) REFERENCES public.usuarios(id);


--
-- Name: expedientes expedientes_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplinas(id);


--
-- Name: expedientes expedientes_id_expediente_padre_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_id_expediente_padre_fkey FOREIGN KEY (id_expediente_padre) REFERENCES public.expedientes(id);


--
-- Name: expedientes expedientes_id_proyecto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyectos(id);


--
-- Name: expedientes expedientes_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.usuarios(id);


--
-- Name: formularios formularios_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formularios
    ADD CONSTRAINT formularios_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplinas(id);


--
-- Name: formularios formularios_id_proyecto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formularios
    ADD CONSTRAINT formularios_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyectos(id);


--
-- Name: procesos procesos_id_area_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos
    ADD CONSTRAINT procesos_id_area_fkey FOREIGN KEY (id_area) REFERENCES public.areas(id);


--
-- Name: proyectos proyectos_id_area_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_id_area_fkey FOREIGN KEY (id_area) REFERENCES public.areas(id);


--
-- Name: respuestas_formulario respuestas_formulario_id_campo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas_formulario
    ADD CONSTRAINT respuestas_formulario_id_campo_fkey FOREIGN KEY (id_campo) REFERENCES public.campos_formulario(id);


--
-- Name: respuestas_formulario respuestas_formulario_id_expediente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respuestas_formulario
    ADD CONSTRAINT respuestas_formulario_id_expediente_fkey FOREIGN KEY (id_expediente) REFERENCES public.expedientes(id);


--
-- Name: tareas tareas_id_etapa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_id_etapa_fkey FOREIGN KEY (id_etapa) REFERENCES public.etapas(id);


--
-- Name: tareas tareas_id_expediente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_id_expediente_fkey FOREIGN KEY (id_expediente) REFERENCES public.expedientes(id);


--
-- Name: tareas tareas_id_usuario_asignado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_id_usuario_asignado_fkey FOREIGN KEY (id_usuario_asignado) REFERENCES public.usuarios(id);


--
-- Name: usuarios usuarios_id_area_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_area_fkey FOREIGN KEY (id_area) REFERENCES public.areas(id);


--
-- PostgreSQL database dump complete
--
