import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { User, DisciplineItem } from '../models/data-models';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  users!: Table<User, number>;
  tasks!: Table<DisciplineItem, string>;

  constructor() {
    super('pocket-discipline-db');
    this.version(1).stores({
      users: 'id', // Primary key
      tasks: 'id, type, isCompleted' // Primary key and indexed props
    });
  }
}
