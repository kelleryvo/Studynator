CREATE DATABASE IF NOT EXISTS studynator;
USE studynator;

CREATE TABLE tbl_user(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE tbl_school(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(100)
);

CREATE TABLE tbl_permission(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE tbl_user_permission(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_user INTEGER NOT NULL,
    fk_permission INTEGER NOT NULL,

    FOREIGN KEY (fk_user) REFERENCES tbl_user(id),
    FOREIGN KEY (fk_permission) REFERENCES tbl_permission(id)
);

CREATE TABLE tbl_class(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    fk_school INTEGER NOT NULL

    FOREIGN KEY (fk_school) REFERENCES tbl_school(id)
);


CREATE TABLE tbl_subject(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    fk_user INTEGER NOT NULL,

    FOREIGN KEY (fk_user) REFERENCES tbl_user(id)
);

CREATE TABLE tbl_user_class(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_user INTEGER NOT NULL,
    fk_class INTEGER NOT NULL,

    FOREIGN KEY (fk_user) REFERENCES tbl_user(id),
    FOREIGN KEY (fk_class) REFERENCES tbl_class(id)
);


CREATE TABLE tbl_class_subject(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_class INTEGER NOT NULL,
    fk_subject INTEGER NOT NULL,

    FOREIGN KEY (fk_class) REFERENCES tbl_class(id),
    FOREIGN KEY (fk_subject) REFERENCES tbl_subject(id)
);

CREATE TABLE tbl_homework(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_subject INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    due_date DATE NOT NULL,

    FOREIGN KEY (fk_subject) REFERENCES tbl_subject(id)
);

CREATE TABLE tbl_exams(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_subject INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    due_date DATE NOT NULL,

    FOREIGN KEY (fk_subject) REFERENCES tbl_subject(id)
);

CREATE TABLE tbl_priority(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_user INTEGER NOT NULL,
    fk_exam INTEGER NOT NULL,
    planned_effort INTEGER NOT NULL,
    priority INTEGER NOT NULL,

    FOREIGN KEY (fk_user) REFERENCES tbl_user(id),
    FOREIGN KEY (fk_exam) REFERENCES tbl_exams(id)
);

CREATE TABLE tbl_progress(
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_priority INTEGER NOT NULL,
    effort INTEGER NOT NULL,
    date_progress DATE NOT NULL,

    FOREIGN KEY (fk_priority) REFERENCES tbl_priority(id)
);
