import { Importers } from '../../importer';
import { CsvImporterInfo } from '../lib/info';
import { CsvImporter } from './importer';

Importers.add(new CsvImporterInfo(), CsvImporter);
