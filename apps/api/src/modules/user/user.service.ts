import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  private users: User[] = []; // temp in-memory store
  private idCounter = 1;

  create(createUserInput: CreateUserInput) {
    const user = { id: this.idCounter++, ...createUserInput };
    this.users.push(user);
    return user; // ← must return User object
  }

  findAll() {
    return this.users; // ← must return User[] array
  }

  findOne(id: number) {
    return this.users.find(u => u.id === id); // ← must return User object
  }

  update(id: number, updateUserInput: UpdateUserInput) {
    const index = this.users.findIndex(u => u.id === id);
    this.users[index] = { ...this.users[index], ...updateUserInput };
    return this.users[index]; // ← must return User object
  }

  remove(id: number) {
    const user = this.findOne(id);
    this.users = this.users.filter(u => u.id !== id);
    return user; // ← must return removed User object
  }
}