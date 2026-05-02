import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { EscrowModule } from './modules/escrow/escrow.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    PayrollModule,
    ComplianceModule,
    EscrowModule,
  ],
})
export class AppModule {}
