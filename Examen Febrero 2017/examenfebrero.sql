-- phpMyAdmin SQL Dump
-- version 4.6.5.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Feb 02, 2017 at 10:45 
-- Server version: 10.1.21-MariaDB
-- PHP Version: 5.6.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `examenfebrero`
--
CREATE DATABASE IF NOT EXISTS `examenfebrero`;

-- --------------------------------------------------------

--
-- Table structure for table `articulos`
--

CREATE TABLE `articulos` (
  `Id` int(11) NOT NULL,
  `Titulo` varchar(300) NOT NULL,
  `Fecha` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `articulos`
--

INSERT INTO `articulos` (`Id`, `Titulo`, `Fecha`) VALUES
(1, 'An inference algorithm for guaranteeing Safe destruction', '2008-07-20'),
(2, 'A type system for region management and its proof of correctness', '2010-07-21'),
(3, 'Shape analysis by regular languages', '2009-05-30'),
(4, 'Polymorphic type specifications', '2016-03-01'),
(5, 'Yet to be written', '2017-02-01');

-- --------------------------------------------------------

--
-- Table structure for table `palabrasclave`
--

CREATE TABLE `palabrasclave` (
  `IdArticulo` int(11) NOT NULL,
  `PalabraClave` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `palabrasclave`
--

INSERT INTO `palabrasclave` (`IdArticulo`, `PalabraClave`) VALUES
(1, 'memory'),
(1, 'inference'),
(1, 'formal'),
(2, 'type system'),
(2, 'memory'),
(4, 'type system'),
(4, 'success types');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `articulos`
--
ALTER TABLE `articulos`
  ADD PRIMARY KEY (`Id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `articulos`
--
ALTER TABLE `articulos`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
