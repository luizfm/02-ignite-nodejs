import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import { app } from '../src/app'
import request from 'supertest'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({ title: 'New transaction', amount: 5000, type: 'credit' })
      .expect(201)
  })

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({ title: 'New transaction', amount: 5000, type: 'credit' })
      .expect(201)

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsResponse.body).toEqual({
      transactions: [
        expect.objectContaining({
          title: 'New transaction',
          amount: 5000,
        }),
      ],
    })
  })

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({ title: 'transaction', amount: 4000, type: 'credit' })
      .expect(201)

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)

    const transactionId = listTransactionResponse.body.transactions[0].id

    const transaction = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)

    console.log('aqui', transaction.body)

    expect(transaction.body).toEqual({
      transaction: expect.objectContaining({
        title: 'transaction',
        amount: 4000,
      }),
    })
  })

  it('should be able to list transactions summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 3000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie')

    await request(app.server)
      .post('/transactions')
      .send({
        title: 'New debit transaction',
        amount: 2000,
        type: 'debit',
      })
      .set('Cookie', cookies)

    const summary = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)

    expect(summary.body).toEqual({
      summary: expect.objectContaining({
        amount: 1000,
      }),
    })
  })
})
