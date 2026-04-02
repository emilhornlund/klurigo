import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import type { PaginatedMediaPhotoSearchDto } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { useKlurigoServiceClient } from '../../../../api'
import colors from '../../../../styles/colors.tokens.module.scss'
import { classNames } from '../../../../utils/helpers'
import Button from '../../../Button'
import ResponsiveImage from '../../../ResponsiveImage'
import TextField from '../../../TextField'
import styles from '../../MediaModal.module.scss'

export interface PexelsImageProviderProps {
  onChange?: (url: string) => void
}

const PexelsImageProvider: FC<PexelsImageProviderProps> = ({ onChange }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] =
    useState<PaginatedMediaPhotoSearchDto>()
  const [selectedUrl, setSelectedUrl] = useState<string>()

  const { searchPhotos } = useKlurigoServiceClient()
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)

  const handleSelect = (url: string) => {
    setSelectedUrl(url)
    onChange?.(url)
  }

  const handleSearch = () => {
    if (searchTerm.trim().length) {
      setSelectedUrl(undefined)
      setSearchResults(undefined)
      setIsLoadingSearch(true)
      searchPhotos(searchTerm)
        .then(setSearchResults)
        .finally(() => setIsLoadingSearch(false))
    }
  }

  return (
    <>
      <form
        className={classNames(styles.column, styles.search)}
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}>
        <div className={styles.textFieldWrapper}>
          <TextField
            id="image-search-textfield"
            type="text"
            kind="secondary"
            value={searchTerm}
            placeholder="Search"
            onChange={(value) => setSearchTerm(value as string)}
          />
        </div>
        <Button
          id="image-search-button"
          type="submit"
          kind="call-to-action"
          icon={faMagnifyingGlass}
          loading={isLoadingSearch}
          disabled={!searchTerm.trim().length}
          onClick={handleSearch}
        />
      </form>

      {searchResults?.photos && !isLoadingSearch && (
        <div className={classNames(styles.column, styles.resultsColumn)}>
          <div className={styles.resultsGrid}>
            {searchResults.photos.map((result) => (
              <button
                key={result.photoURL}
                className={styles.itemButton}
                onClick={() => handleSelect(result.photoURL)}>
                <ResponsiveImage
                  imageURL={result.thumbnailURL}
                  fit="width"
                  borderColor={
                    selectedUrl === result.photoURL
                      ? colors.colorFocusRing
                      : 'transparent'
                  }
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default PexelsImageProvider
