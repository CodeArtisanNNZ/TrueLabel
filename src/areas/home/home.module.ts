import { Module } from '@nestjs/common';
import { HomeController } from './controllers/home.controller';
import { FoodCatalogModule } from '../food-catalog/food-catalog.module';
import { FoodSafetyModule } from '../food-safety/food-safety.module';
import { PersonalFoodModule } from '../personal-food/personal-food.module';

@Module({
  imports: [FoodCatalogModule, FoodSafetyModule, PersonalFoodModule],
  controllers: [HomeController],
})
export class HomeModule {}
