import { Injectable, Logger } from '@nestjs/common'
import {
  Model,
  PopulateOptions,
  Query,
  QueryFilter,
  UpdateQuery,
} from 'mongoose'

import { IBaseRepository } from './base-repository.interface'
import { CreateInput } from './types'

/**
 * Options for repository update operations.
 *
 * Allows callers to opt into additional query behaviors (for example, populating
 * referenced fields) while keeping the method signature stable as new options
 * are introduced.
 */
export type UpdateOptions = {
  /**
   * Mongoose populate configuration applied to the updated document query.
   *
   * Accepts a single populate definition or an array of populate definitions.
   * When omitted, no population is performed.
   */
  populate?: PopulateOptions | PopulateOptions[]
}

/**
 * Plain object representation used for safe merging and replacement document construction.
 *
 * This type is intentionally broad to support arbitrary document shapes while avoiding `any`.
 */
type PlainObject = Record<string, unknown>

/**
 * Abstract base repository providing common CRUD operations
 */
@Injectable()
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected readonly logger: Logger

  protected constructor(
    protected readonly model: Model<T>,
    protected readonly modelName: string,
  ) {
    this.logger = new Logger(`${modelName}Repository`)
  }

  /**
   * Find a document by its ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const document = await this.model.findById(id)
      if (!document) {
        this.logger.debug(`Document with id '${id}' not found`)
      }
      return document
    } catch (error) {
      this.logger.error(`Error finding document by id '${id}':`, error)
      throw error
    }
  }

  /**
   * Find a single document matching the filter
   */
  async findOne(filter: QueryFilter<T>): Promise<T | null> {
    try {
      const document = await this.model.findOne(filter)
      if (!document) {
        this.logger.debug(`No document found matching filter:`, filter)
      }
      return document
    } catch (error) {
      this.logger.error(`Error finding document with filter:`, error)
      throw error
    }
  }

  /**
   * Find multiple documents matching the filter
   */
  async find(filter: QueryFilter<T> = {}): Promise<T[]> {
    try {
      return await this.model.find(filter)
    } catch (error) {
      this.logger.error(`Error finding documents with filter:`, error)
      throw error
    }
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    filter: QueryFilter<T> = {},
    options: {
      skip?: number
      limit?: number
      sort?: Record<string, 1 | -1>
      populate?: string | string[]
    } = {},
  ): Promise<{ documents: T[]; total: number }> {
    try {
      const {
        skip = 0,
        limit = 10,
        sort = { createdAt: -1 as 1 | -1 },
        populate,
      } = options
      const query = this.model.find(filter).skip(skip).limit(limit).sort(sort)
      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach((field) => query.populate(field))
        } else {
          query.populate(populate)
        }
      }
      const [documents, total] = await Promise.all([
        query.exec(),
        this.model.countDocuments(filter),
      ])
      return { documents, total }
    } catch (error) {
      this.logger.error(`Error finding documents with pagination:`, error)
      throw error
    }
  }

  /**
   * Create a new document
   */
  async create(data: CreateInput<T>): Promise<T> {
    try {
      const document = await this.model.create(data)
      this.logger.log(
        `Created new ${this.modelName} document with id '${document._id}'`,
      )
      return document.toObject()
    } catch (error) {
      this.logger.error(`Error creating ${this.modelName} document:`, error)
      throw error
    }
  }

  /**
   * Updates a document by its id and returns the updated document.
   *
   * Applies the repository's update operator normalization via `buildUpdateOps`,
   * and uses `findByIdAndUpdate` with:
   * - `returnDocument: 'after'` to return the updated document
   * - `runValidators: true` to validate the update against the schema
   *
   * @param id - The id of the document to update.
   * @param data - The update payload to apply to the document.
   * @param options - Additional update options (for example, populate configuration).
   *
   * @returns The updated document if found; otherwise `null`.
   */
  async update(
    id: string,
    data: UpdateQuery<T>,
    options: UpdateOptions = {},
  ): Promise<T | null> {
    try {
      const updateOps = this.buildUpdateOps(data)

      const query = this.model.findByIdAndUpdate(id, updateOps, {
        returnDocument: 'after',
        runValidators: true,
      })

      const document = await this.applyPopulate(query, options.populate)

      if (document) {
        this.logger.log(`Updated ${this.modelName} document with id '${id}'`)
      } else {
        this.logger.warn(
          `No ${this.modelName} document found with id '${id}' to update`,
        )
      }

      return document
    } catch (error) {
      this.logger.error(
        `Error updating ${this.modelName} document with id '${id}':`,
        error,
      )
      throw error
    }
  }

  /**
   * Applies optional populate configuration to a Mongoose query.
   *
   * Used to keep repository methods concise while supporting optional population
   * of referenced fields on read/update queries.
   *
   * @param query - The Mongoose query to optionally populate.
   * @param populate - Populate configuration to apply (single or multiple paths).
   *
   * @returns The same query instance, with population applied when provided.
   * @private
   */
  private applyPopulate<R>(
    query: Query<R, T>,
    populate?: PopulateOptions | PopulateOptions[],
  ): Query<R, T> {
    if (!populate) return query
    return query.populate(populate)
  }

  /**
   * Update multiple documents matching the filter
   */
  async updateMany(
    filter: QueryFilter<T>,
    data: UpdateQuery<T>,
  ): Promise<number> {
    try {
      const options: Record<string, unknown> = { runValidators: true }

      if (Array.isArray(data)) {
        options.updatePipeline = true
      }

      const result = await this.model.updateMany(filter, data, options)
      this.logger.log(
        `Updated ${result.modifiedCount} ${this.modelName} documents`,
      )
      return result.modifiedCount
    } catch (error) {
      this.logger.error(`Error updating ${this.modelName} documents:`, error)
      throw error
    }
  }

  /**
   * Replaces a document by its id and returns the replaced document.
   *
   * Uses full replacement semantics via `findOneAndReplace`, but first loads the existing
   * document to ensure a baseline exists. The replacement payload is created by:
   * - converting the existing document into a plain object baseline,
   * - normalizing the incoming payload into a plain object,
   * - merging baseline + incoming while enforcing repository-level invariants,
   * - casting through the model to normalize embedded schemas and discriminators.
   *
   * Repository-level invariants enforced by this method:
   * - `_id` is forced to match the provided id (incoming values are ignored),
   * - internal Mongoose version key (`__v`) is removed to avoid persisting version state.
   *
   * No domain-specific fields (for example timestamps like `created`/`updated`) are interpreted
   * or modified here. Such behavior must be handled by schema configuration (for example
   * Mongoose timestamps) or higher-level services.
   *
   * @param id - The id of the document to replace.
   * @param data - The replacement payload applied on top of the existing persisted document.
   * @param options - Additional replace options (for example, populate configuration).
   *
   * @returns The replaced document if found; otherwise `null`.
   */
  public async replace(
    id: string,
    data: Partial<T>,
    options: UpdateOptions = {},
  ): Promise<T | null> {
    try {
      const existing = await this.model.findById(id).exec()

      if (!existing) {
        this.logger.warn(
          `No ${this.modelName} document found with id '${id}' to replace`,
        )
        return null
      }

      const base = existing.toObject(this.getRepositoryObjectOptions())
      const incoming = this.normalizeToPlainObject(data)

      const merged = this.buildReplacementDocument(id, base, incoming)

      const casted = new this.model(merged)
      const replacement = casted.toObject(this.getRepositoryObjectOptions())

      const query = this.model.findOneAndReplace({ _id: id }, replacement, {
        returnDocument: 'after',
        runValidators: true,
        overwriteDiscriminatorKey: true,
      })

      const document = await this.applyPopulate(query, options.populate)

      if (document) {
        this.logger.log(`Replaced ${this.modelName} document with id '${id}'`)
      } else {
        this.logger.warn(
          `No ${this.modelName} document found with id '${id}' to replace (document disappeared between load and replace)`,
        )
      }

      return document
    } catch (error) {
      this.logger.error(
        `Error replacing ${this.modelName} document with id '${id}':`,
        error,
      )
      throw error
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id)
      if (result) {
        this.logger.log(`Deleted ${this.modelName} document with id '${id}'`)
        return true
      } else {
        this.logger.warn(
          `No ${this.modelName} document found with id '${id}' to delete`,
        )
        return false
      }
    } catch (error) {
      this.logger.error(
        `Error deleting ${this.modelName} document with id '${id}':`,
        error,
      )
      throw error
    }
  }

  /**
   * Delete multiple documents matching the filter
   */
  async deleteMany(filter: QueryFilter<T>): Promise<number> {
    try {
      const result = await this.model.deleteMany(filter)
      this.logger.log(
        `Deleted ${result.deletedCount} ${this.modelName} documents`,
      )
      return result.deletedCount
    } catch (error) {
      this.logger.error(`Error deleting ${this.modelName} documents:`, error)
      throw error
    }
  }

  /**
   * Count documents matching the filter
   */
  async count(filter: QueryFilter<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter)
    } catch (error) {
      this.logger.error(`Error counting ${this.modelName} documents:`, error)
      throw error
    }
  }

  /**
   * Check if a document exists matching the filter
   */
  async exists(filter: QueryFilter<T>): Promise<boolean> {
    try {
      const exists = await this.model.exists(filter)
      return !!exists
    } catch (error) {
      this.logger.error(
        `Error checking ${this.modelName} document existence:`,
        error,
      )
      throw error
    }
  }

  /**
   * Builds an update operations object by splitting the input data into
   * MongoDB $set and $unset operators.
   *
   * This handles fields set to `undefined` by converting them to $unset
   * operations, which removes the field from the document. This preserves
   * the behavior from pre-refactor code (e.g., using doc.set() + save()),
   * where setting a field to undefined would unset it. Direct Mongoose
   * update methods (like findByIdAndUpdate or updateMany) ignore undefined
   * values by default, so this explicit split ensures unset works as expected.
   *
   * If the input data already contains MongoDB operators (e.g., $inc), this
   * may not handle them—add a guard if needed in calling methods.
   *
   * @param data - The update data, potentially containing undefined values.
   * @returns An object with $set and/or $unset, or an empty object if no changes.
   */
  private buildUpdateOps(data: UpdateQuery<T>): UpdateQuery<T> {
    const $set: { [K in keyof T]?: T[K] } = {}
    const $unset: { [K in keyof T]?: string } = {} // Use string for $unset values ('' is conventional)
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        $unset[key as keyof T] = ''
      } else {
        $set[key as keyof T] = value
      }
    }
    return {
      ...(Object.keys($set).length > 0 ? { $set } : {}),
      ...(Object.keys($unset).length > 0 ? { $unset } : {}),
    }
  }

  /**
   * Returns the object conversion options used when converting documents to plain objects.
   *
   * Uses `depopulate` to ensure referenced documents are represented by their ids,
   * disables version key and disables virtuals/getters to avoid persisting derived fields.
   *
   * @returns Object conversion options applied to `toObject()` in repository operations.
   * @private
   */
  private getRepositoryObjectOptions(): {
    depopulate: true
    versionKey: false
    virtuals: false
    getters: false
  } {
    return {
      depopulate: true,
      versionKey: false,
      virtuals: false,
      getters: false,
    }
  }

  /**
   * Normalizes an input value into a plain object suitable for merging and replacement.
   *
   * If the value is a Mongoose document or subdocument, `toJSON()` is used when available
   * to obtain a plain representation. Non-object inputs and non-plain objects return `{}`.
   *
   * @param value - The value to normalize.
   * @returns A plain object representation of the value, or an empty object when unsupported.
   * @private
   */
  private normalizeToPlainObject(value: unknown): PlainObject {
    if (!value || typeof value !== 'object') return {}

    if (this.hasToJSON(value)) {
      const json = value.toJSON()
      return this.isPlainObject(json) ? json : {}
    }

    if (this.isPlainObject(value)) return value

    return {}
  }

  /**
   * Builds the final replacement document payload for `findOneAndReplace`.
   *
   * Merges the current persisted document (`base`) with the incoming payload (`incoming`)
   * using full-replacement semantics, then enforces repository-level invariants:
   * - `_id` is forced to match the provided id (incoming values are ignored),
   * - internal Mongoose version key (`__v`) is removed to avoid persisting version state.
   *
   * No domain-specific fields (for example timestamps like `created`/`updated` or business
   * properties) are interpreted or modified here. Such behavior must be handled by schema
   * configuration (for example Mongoose timestamps) or by higher-level services.
   *
   * @param id - The id of the document being replaced.
   * @param base - Plain object representation of the persisted document.
   * @param incoming - Plain object representation of the incoming replacement payload.
   * @returns The merged replacement payload suitable for `findOneAndReplace`.
   * @private
   */
  private buildReplacementDocument(
    id: string,
    base: PlainObject,
    incoming: PlainObject,
  ): PlainObject {
    const merged: PlainObject = {
      ...base,
      ...incoming,
      _id: id, // enforce immutable id
    }

    delete merged['__v'] // strip mongoose internal version key

    return merged
  }

  /**
   * Type guard for values that provide a `toJSON()` method.
   *
   * Used to detect Mongoose documents/subdocuments (and similar objects) that can be
   * converted into a plain JSON-compatible representation.
   *
   * @param value - The object to check.
   * @returns `true` when the value has a callable `toJSON()` method.
   * @private
   */
  private hasToJSON(value: object): value is { toJSON: () => unknown } {
    return (
      'toJSON' in value &&
      typeof (value as { toJSON?: unknown }).toJSON === 'function'
    )
  }

  /**
   * Type guard for plain objects (non-null, non-array).
   *
   * Used to ensure merge inputs are safe plain objects and not arrays or class instances.
   *
   * @param value - The value to check.
   * @returns `true` when the value is a plain object.
   * @private
   */
  private isPlainObject(value: unknown): value is PlainObject {
    if (typeof value !== 'object' || value === null) return false
    if (Array.isArray(value)) return false

    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
  }
}
