import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService')

  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected.')
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto
    })
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto

    const totalProducts = await this.product.count({ where: { available: true } })
    const totalPages = Math.ceil(totalProducts / limit!)

    return {
      data: await this.product.findMany({
        where: { available: true },
        skip: (page! - 1) * limit!,
        take: limit
      }),
      meta: {
        page: page,
        totalPages: totalPages,
        totalProducts: totalProducts
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({ where: { id, available: true } })

    if (!product) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Product with id ${id} not found`
      })
    }

    return {
      data: product
    };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;
    await this.findOne(id);
    return this.product.update({
      where: { id },
      data: data
    });
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.product.update({
      where: { id },
      data: { available: false }
    });
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));
    ids = ids.map(id => Number(id))
    
    const products = await this.product.findMany({
      where: {
        id: {
          in: ids
        },
        available: true
      }
    })

    if (products.length !== ids.length) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Some products were not found'
      })
    }

    return products
  }
}
