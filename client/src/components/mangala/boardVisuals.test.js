import test from 'node:test'
import assert from 'node:assert/strict'
import { getStoneRows, getStoreStoneRows } from './boardVisuals.js'

test('getStoneRows fills a two-column four-row base layer before stacking', () => {
  const rows = getStoneRows(9)

  assert.equal(rows.length, 5)
  assert.deepEqual(
    rows.map((row) => row.stonesInRow),
    [2, 2, 2, 2, 1],
  )
  assert.deepEqual(
    rows.map((row) => row.offset),
    [1.5, 0.5, -0.5, -1.5, 1.5],
  )
  assert.equal(rows[4].layerShiftX, 0)
  assert.equal(rows[4].layerShiftY < 0, true)
})

test('getStoreStoneRows uses the same layered two-column layout', () => {
  const rows = getStoreStoneRows(10)

  assert.equal(rows.length, 5)
  assert.deepEqual(
    rows.map((row) => row.stonesInRow),
    [2, 2, 2, 2, 2],
  )
  assert.deepEqual(
    rows.map((row) => row.offset),
    [2.5, 1.5, 0.5, -0.5, -1.5],
  )
})

test('getStoneRows keeps stacking into a third layer after 16 stones', () => {
  const rows = getStoneRows(17)

  assert.equal(rows.length, 9)
  assert.equal(rows[8].stonesInRow, 1)
  assert.equal(rows[8].offset, 1.5)
  assert.equal(rows[8].layerShiftX, 0)
  assert.equal(rows[8].layerShiftY < rows[4].layerShiftY, true)
})

test('getStoreStoneRows starts a second layer only after 12 stones', () => {
  const rows = getStoreStoneRows(13)

  assert.equal(rows.length, 7)
  assert.deepEqual(
    rows.map((row) => row.stonesInRow),
    [2, 2, 2, 2, 2, 2, 1],
  )
  assert.deepEqual(
    rows.map((row) => row.offset),
    [2.5, 1.5, 0.5, -0.5, -1.5, -2.5, 2.5],
  )
  assert.equal(rows[6].layerShiftX, 0)
  assert.equal(rows[6].layerShiftY < 0, true)
})
