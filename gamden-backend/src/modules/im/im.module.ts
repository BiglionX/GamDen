import { Module } from '@nestjs/common';
import { ImService } from './im.service';
import { ImController } from './im.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [ImService],
  controllers: [ImController],
  exports: [ImService],
})
export class ImModule {}
